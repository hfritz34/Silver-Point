using SilverPoint.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<KrogerService>();
builder.Services.AddSingleton<CommunityDealStore>();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health for load balancers and CI
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Representative store coords (Chicago-area defaults; shift with real user lat/lng)
var storeCoords = new (string Name, double Lat, double Lng)[]
{
    ("Walmart",     41.8500, -87.6800),
    ("Kroger",      41.8600, -87.6600),
    ("Target",      41.8700, -87.6500),
    ("CVS",         41.8450, -87.6700),
    ("Walgreens",   41.8550, -87.6900),
    ("Costco",      41.8800, -87.7200),
    ("Whole Foods", 41.8650, -87.6400),
};

var defaultDist = new Dictionary<string, double>
{
    ["Walmart"] = 0.8,
    ["Kroger"] = 1.1,
    ["Target"] = 1.5,
    ["CVS"] = 0.6,
    ["Walgreens"] = 0.4,
    ["Costco"] = 3.2,
    ["Whole Foods"] = 2.1,
};

// Haversine distance in miles
double Miles(double lat1, double lng1, double lat2, double lng2)
{
    const double R = 3958.8;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
        + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
        * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
    return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
}

double Dist(string store, double? lat, double? lng)
{
    if (lat is null || lng is null)
    {
        return defaultDist.GetValueOrDefault(store, 1.0);
    }

    var coord = storeCoords.FirstOrDefault(s => s.Name == store);
    return coord == default ? 1.0 : Math.Round(Miles(lat.Value, lng.Value, coord.Lat, coord.Lng), 1);
}

PriceSearchResult[] GetResults(string query, double? lat, double? lng, CommunityDealStore dealStore)
{
    var q = query.ToLowerInvariant();

    PriceSearchResult[] WithDist(string product, (string store, decimal price, string stock)[] items) =>
        [.. items
            .Select(x => new PriceSearchResult(
                product,
                x.store,
                x.price,
                Dist(x.store, lat, lng),
                x.stock,
                false,
                null,
                "demo",
                0.7))
            .OrderBy(x => x.Price)];

    var baseResults = q switch
    {
        _ when q.Contains("formula") || q.Contains("infant") => WithDist("infant formula",
        [
            ("Walmart", 18.99m, "low_stock"),
            ("Target", 22.49m, "in_stock"),
            ("Kroger", 24.99m, "out_of_stock"),
            ("CVS", 26.99m, "in_stock"),
            ("Walgreens", 27.49m, "in_stock"),
        ]),
        _ when q.Contains("milk") => WithDist("milk",
        [
            ("Walmart", 2.49m, "in_stock"),
            ("Kroger", 2.79m, "in_stock"),
            ("Target", 3.19m, "in_stock"),
            ("CVS", 3.49m, "low_stock"),
            ("Walgreens", 3.89m, "in_stock"),
        ]),
        _ when q.Contains("egg") => WithDist("eggs",
        [
            ("Walmart", 3.49m, "in_stock"),
            ("Kroger", 3.99m, "in_stock"),
            ("Costco", 4.99m, "in_stock"),
            ("Target", 5.49m, "low_stock"),
            ("Whole Foods", 6.99m, "in_stock"),
        ]),
        _ when q.Contains("ibuprofen") || q.Contains("advil") => WithDist("ibuprofen",
        [
            ("Walmart", 4.99m, "in_stock"),
            ("Kroger", 6.49m, "in_stock"),
            ("Target", 7.99m, "in_stock"),
            ("CVS", 9.99m, "in_stock"),
            ("Walgreens", 12.99m, "in_stock"),
        ]),
        _ when q.Contains("diaper") => WithDist("diapers",
        [
            ("Walmart", 22.99m, "in_stock"),
            ("Costco", 24.99m, "in_stock"),
            ("Target", 26.99m, "in_stock"),
            ("Kroger", 29.49m, "low_stock"),
            ("CVS", 34.99m, "in_stock"),
        ]),
        _ => WithDist(query,
        [
            ("Walmart", 5.99m, "in_stock"),
            ("Target", 7.49m, "in_stock"),
            ("CVS", 8.99m, "in_stock"),
        ]),
    };

    var community = dealStore.GetAll()
        .Where(d => d.ProductName.ToLowerInvariant().Contains(q) || q.Contains(d.ProductName.ToLowerInvariant()))
        .Select(d => new PriceSearchResult(
            d.ProductName,
            d.StoreName,
            d.Price,
            Dist(d.StoreName, lat, lng),
            "in_stock",
            true,
            d.VerifiedAt,
            d.Source,
            d.Source is "receipt" or "vendor" ? 0.95 : 0.85));

    return [.. baseResults, .. community];
}

// Search endpoint tries Kroger live data first, then falls back to demo and community data.
app.MapGet("/api/search", async (string? q, double? lat, double? lng, KrogerService kroger, CommunityDealStore dealStore) =>
{
    var query = q?.Trim() ?? "";

    if (lat is not null && lng is not null)
    {
        var locs = await kroger.GetNearbyLocationsAsync(lat.Value, lng.Value);
        if (locs.Count > 0)
        {
            var krogerResults = new List<PriceSearchResult>();
            foreach (var loc in locs)
            {
                var products = await kroger.SearchProductsAsync(query, loc.LocationId);
                if (products is null)
                {
                    break;
                }

                var best = products.MinBy(p => p.Price);
                if (best is not null)
                {
                    krogerResults.Add(new PriceSearchResult(
                        best.Description,
                        loc.Name,
                        best.Price,
                        Math.Round(loc.DistMi, 1),
                        best.Stock,
                        false,
                        DateTimeOffset.UtcNow,
                        "kroger_api",
                        0.9));
                }
            }

            if (krogerResults.Count > 0)
            {
                return Results.Ok(krogerResults.OrderBy(x => x.Price).ToList());
            }
        }
    }

    return Results.Ok(GetResults(query, lat, lng, dealStore));
});

app.MapGet("/api/deals", (CommunityDealStore dealStore) =>
    Results.Ok(dealStore.GetAll()));

// Post a community deal
app.MapPost("/api/deals", (DealRequest req, CommunityDealStore dealStore) =>
{
    if (string.IsNullOrWhiteSpace(req.ProductName) || string.IsNullOrWhiteSpace(req.StoreName) || req.Price <= 0)
    {
        return Results.BadRequest(new { error = "productName, storeName, and price > 0 required" });
    }

    var deal = dealStore.Add(req);
    return Results.Created($"/api/deals/{deal.Id}", new { ok = true, deal, pointsAwarded = 10 });
});

// Shopping list optimizer: given a list of items, find the cheapest store combination.
app.MapGet("/api/list/optimize", (string[] items, string? mode, double? lat, double? lng, CommunityDealStore dealStore) =>
{
    if (items.Length == 0)
    {
        return Results.BadRequest(new { error = "At least one item is required" });
    }

    var priceMap = new Dictionary<string, Dictionary<string, decimal>>();
    foreach (var item in items)
    {
        var results = GetResults(item, lat, lng, dealStore);
        foreach (var result in results)
        {
            if (!priceMap.ContainsKey(result.StoreName))
            {
                priceMap[result.StoreName] = [];
            }

            if (!priceMap[result.StoreName].ContainsKey(item) || result.Price < priceMap[result.StoreName][item])
            {
                priceMap[result.StoreName][item] = result.Price;
            }
        }
    }

    if (mode == "fewest_stops")
    {
        var bestStore = priceMap
            .Where(s => s.Value.Count > 0)
            .OrderByDescending(s => s.Value.Count)
            .ThenBy(s => s.Value.Values.Sum())
            .FirstOrDefault();

        if (bestStore.Key is null)
        {
            return Results.Ok(Array.Empty<object>());
        }

        return Results.Ok(new[]
        {
            new
            {
                storeName = bestStore.Key,
                items = bestStore.Value.Select(kv => new { name = kv.Key, price = kv.Value }).ToArray(),
                subtotal = bestStore.Value.Values.Sum(),
                distanceMi = Dist(bestStore.Key, lat, lng),
            },
        });
    }

    var cheapestByItem = new Dictionary<string, (string store, decimal price)>();
    foreach (var item in items)
    {
        string? bestStore = null;
        decimal bestPrice = decimal.MaxValue;
        foreach (var (store, storeItems) in priceMap)
        {
            if (storeItems.TryGetValue(item, out var price) && price < bestPrice)
            {
                bestPrice = price;
                bestStore = store;
            }
        }

        if (bestStore is not null)
        {
            cheapestByItem[item] = (bestStore, bestPrice);
        }
    }

    var grouped = cheapestByItem
        .GroupBy(kv => kv.Value.store)
        .Select(g => new
        {
            storeName = g.Key,
            items = g.Select(kv => new { name = kv.Key, price = kv.Value.price }).ToArray(),
            subtotal = g.Sum(kv => kv.Value.price),
            distanceMi = Dist(g.Key, lat, lng),
        })
        .OrderBy(r => r.distanceMi)
        .ToArray();

    return Results.Ok(grouped);
});

app.Run();
