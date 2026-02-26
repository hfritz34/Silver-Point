using System.Net;
using System.Text.Json;
using System.Net.Http;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient(Microsoft.Extensions.Options.Options.DefaultName, c => { })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        AutomaticDecompression = DecompressionMethods.All
    }); // Register HttpClient with auto-decompression

builder.Services.AddSingleton<SilverPoint.Api.KrogerApiService>(); // Register Kroger API


var app = builder.Build();
app.UseHttpsRedirection();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health for load balancers and CI
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Mock store data for fallback
var ALL_STORES = new[]
{
    new { Id = "S1", Name = "Kroger (Downtown)", Lat = 34.0522, Lng = -118.2437 },
    new { Id = "S2", Name = "Target (Westside)", Lat = 34.0400, Lng = -118.4400 },
    new { Id = "S3", Name = "Walmart Supercenter", Lat = 40.7128, Lng = -74.0060 },
    new { Id = "S4", Name = "Target (Manhattan)", Lat = 40.7500, Lng = -73.9800 },
    new { Id = "S5", Name = "Aldi", Lat = 41.8781, Lng = -87.6298 },
    new { Id = "S6", Name = "Trader Joe's", Lat = 41.9000, Lng = -87.6500 },
    new { Id = "S7", Name = "H-E-B", Lat = 29.7604, Lng = -95.3698 },
    new { Id = "S8", Name = "Safeway", Lat = 47.6062, Lng = -122.3321 },
    new { Id = "S9", Name = "Publix", Lat = 25.7617, Lng = -80.1918 },
    new { Id = "S10", Name = "King Soopers", Lat = 39.7392, Lng = -104.9903 },
    new { Id = "S11", Name = "Meijer", Lat = 42.3314, Lng = -83.0458 },
    new { Id = "S12", Name = "Whole Foods Market", Lat = 37.7749, Lng = -122.4194 },
    new { Id = "S13", Name = "Wegmans", Lat = 42.3601, Lng = -71.0589 }
};

double CalculateDistanceMi(double lat1, double lon1, double lat2, double lon2)
{
    var dLat = (lat2 - lat1) * Math.PI / 180.0;
    var dLon = (lon2 - lon1) * Math.PI / 180.0;
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    return 3958.8 * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
}

// Demo search: dynamic results based on lat/lng distance, Kroger API, and Google Places
app.MapGet("/api/search", async (
    string? q, double? lat, double? lng, 
    IConfiguration config, 
    IHttpClientFactory httpClientFactory,
    SilverPoint.Api.KrogerApiService krogerApi) =>
{
    var query = q?.Trim() ?? "item";
    var rand = new Random(query.GetHashCode());

    var krogerClientId = config["KrogerClientId"];
    var krogerClientSecret = config["KrogerClientSecret"];
    var useKroger = !string.IsNullOrWhiteSpace(krogerClientId) && !string.IsNullOrWhiteSpace(krogerClientSecret) && lat.HasValue && lng.HasValue;

    var googleApiKey = config["GoogleMapsApiKey"];
    var useGoogleMaps = !string.IsNullOrWhiteSpace(googleApiKey) && lat.HasValue && lng.HasValue;

    var finalResults = new List<dynamic>();

    // STRATEGY 1: KROGER DEVELOPER API (REAL PRICES)
    if (useKroger)
    {
        var krogerLocations = await krogerApi.GetNearbyLocationsAsync(lat!.Value, lng!.Value);
        
        // Take up to 3 nearest Kroger stores to prevent API rate limiting
        foreach (var loc in krogerLocations.OrderBy(l => CalculateDistanceMi(lat.Value, lng.Value, l.Lat, l.Lng)).Take(3))
        {
            var productData = await krogerApi.GetProductPriceAsync(query, loc.LocationId);
            if (productData != null)
            {
                finalResults.Add(new 
                {
                    productName = productData.ProductName,
                    storeName = loc.Name,
                    price = productData.Price,
                    distanceMi = Math.Round(CalculateDistanceMi(lat.Value, lng.Value, loc.Lat, loc.Lng), 1),
                    inStock = productData.InStock
                });
            }
        }
    }

    // STRATEGY 2: GOOGLE MAPS API OR STATIC FALLBACK (MOCK PRICES)
    // Only use mock fallback strategies if Kroger yielded nothing (e.g., no Kroger stores nearby, key invalid, etc.)
    if (finalResults.Count == 0)
    {
        IEnumerable<dynamic> rawStores = ALL_STORES;

        if (useGoogleMaps)
        {
            var client = httpClientFactory.CreateClient();
            var url = $"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=16093&type=supermarket&keyword=grocery&key={googleApiKey}";
            
            try
            {
                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var doc = JsonDocument.Parse(json);
                    
                    if (doc.RootElement.TryGetProperty("status", out var status) && status.GetString() == "OK" 
                        && doc.RootElement.TryGetProperty("results", out var resultsArr))
                    {
                        var googleStores = new List<dynamic>();
                        foreach (var place in resultsArr.EnumerateArray())
                        {
                            var name = place.GetProperty("name").GetString() ?? "Unknown Store";
                            var geom = place.GetProperty("geometry").GetProperty("location");
                            var pLat = geom.GetProperty("lat").GetDouble();
                            var pLng = geom.GetProperty("lng").GetDouble();
                            
                            googleStores.Add(new { Name = name, Lat = pLat, Lng = pLng });
                        }
                        if (googleStores.Any()) rawStores = googleStores;
                    }
                }
            }
            catch {}
        }

        var computedResults = rawStores.Select(store =>
        {
            var inStock = rand.Next(100) < 90;
            var basePrice = 1.00m + (decimal)rand.NextDouble() * 8.99m;
            var storeNoise = (decimal)(rand.NextDouble() * 2.0 - 1.0);
            var finalPrice = Math.Round(Math.Max(0.50m, basePrice + storeNoise), 2);

            var dist = 0.0;
            if (lat.HasValue && lng.HasValue)
            {
                dist = CalculateDistanceMi(lat.Value, lng.Value, store.Lat, store.Lng);
            }
            else
            {
                dist = rand.NextDouble() * 10.0; 
            }

            return new 
            { 
                productName = query, 
                storeName = store.Name, 
                price = finalPrice, 
                distanceMi = Math.Round(dist, 1),
                inStock = inStock
            };
        });

        if (lat.HasValue && lng.HasValue)
        {
            computedResults = computedResults.OrderBy(r => r.distanceMi).Take(5);
        }
        else
        {
            computedResults = computedResults.Take(3);
        }

        finalResults = computedResults.OrderBy(r => r.price).ToList<dynamic>();
    }
    else
    {
        // If Kroger found real items, just ensure they are sorted by price cheapest first!
        finalResults = finalResults.OrderBy(r => r.price).ToList<dynamic>();
    }

    return Results.Ok(finalResults);
});

app.Run();
