var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<SilverPoint.Api.KrogerService>();

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
    ["Walmart"] = 0.8, ["Kroger"] = 1.1, ["Target"] = 1.5,
    ["CVS"] = 0.6, ["Walgreens"] = 0.4, ["Costco"] = 3.2, ["Whole Foods"] = 2.1,
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
    if (lat is null || lng is null) return defaultDist.GetValueOrDefault(store, 1.0);
    var coord = storeCoords.FirstOrDefault(s => s.Name == store);
    return coord == default ? 1.0 : Math.Round(Miles(lat.Value, lng.Value, coord.Lat, coord.Lng), 1);
}

// In-memory community deals (reset on restart — fine for demo)
var userDeals = new System.Collections.Concurrent.ConcurrentBag<(string product, string store, decimal price)>();

object[] GetResults(string query, double? lat, double? lng)
{
    var q = query.ToLower();

    object[] WithDist(string product, (string store, decimal price, string stock)[] items) =>
        [.. items
            .Select(x => (object)new
            {
                productName = product, storeName = x.store, price = x.price,
                distanceMi = Dist(x.store, lat, lng), stock = x.stock, community = false,
            })
            .OrderBy(x => ((dynamic)x).price)];

    var baseResults = q switch
    {
        _ when q.Contains("formula") || q.Contains("infant") => WithDist("infant formula",
        [
            ("Walmart", 18.99m, "low_stock"), ("Target", 22.49m, "in_stock"),
            ("Kroger", 24.99m, "out_of_stock"), ("CVS", 26.99m, "in_stock"),
            ("Walgreens", 27.49m, "in_stock"),
        ]),
        _ when q.Contains("milk") => WithDist("milk",
        [
            ("Walmart", 2.49m, "in_stock"), ("Kroger", 2.79m, "in_stock"),
            ("Target", 3.19m, "in_stock"), ("CVS", 3.49m, "low_stock"),
            ("Walgreens", 3.89m, "in_stock"),
        ]),
        _ when q.Contains("egg") => WithDist("eggs",
        [
            ("Walmart", 3.49m, "in_stock"), ("Kroger", 3.99m, "in_stock"),
            ("Costco", 4.99m, "in_stock"), ("Target", 5.49m, "low_stock"),
            ("Whole Foods", 6.99m, "in_stock"),
        ]),
        _ when q.Contains("ibuprofen") || q.Contains("advil") => WithDist("ibuprofen",
        [
            ("Walmart", 4.99m, "in_stock"), ("Kroger", 6.49m, "in_stock"),
            ("Target", 7.99m, "in_stock"), ("CVS", 9.99m, "in_stock"),
            ("Walgreens", 12.99m, "in_stock"),
        ]),
        _ when q.Contains("diaper") => WithDist("diapers",
        [
            ("Walmart", 22.99m, "in_stock"), ("Costco", 24.99m, "in_stock"),
            ("Target", 26.99m, "in_stock"), ("Kroger", 29.49m, "low_stock"),
            ("CVS", 34.99m, "in_stock"),
        ]),
        _ => WithDist(query,
        [
            ("Walmart", 5.99m, "in_stock"), ("Target", 7.49m, "in_stock"),
            ("CVS", 8.99m, "in_stock"),
        ]),
    };

    var community = userDeals
        .Where(d => d.product.ToLower().Contains(q) || q.Contains(d.product.ToLower()))
        .Select(d => (object)new
        {
            productName = d.product, storeName = d.store, price = d.price,
            distanceMi = Dist(d.store, lat, lng), stock = "in_stock", community = true,
        });

    return [.. baseResults, .. community];
}

// Search endpoint — tries Kroger live data first, falls back to mock
app.MapGet("/api/search", async (string? q, double? lat, double? lng,
    SilverPoint.Api.KrogerService kroger) =>
{
    var query = q?.Trim() ?? "";

    // Attempt live Kroger data when lat/lng are provided and credentials are configured
    if (lat is not null && lng is not null)
    {
        var locs = await kroger.GetNearbyLocationsAsync(lat.Value, lng.Value);
        if (locs.Count > 0)
        {
            var krogerResults = new List<object>();
            foreach (var loc in locs)
            {
                var products = await kroger.SearchProductsAsync(query, loc.LocationId);
                if (products is null) break; // unconfigured — skip to mock
                var best = products.MinBy(p => p.Price);
                if (best is not null)
                    krogerResults.Add(new
                    {
                        productName = best.Description,
                        storeName = loc.Name,
                        price = best.Price,
                        distanceMi = Math.Round(loc.DistMi, 1),
                        stock = best.Stock,
                        community = false,
                    });
            }
            if (krogerResults.Count > 0)
                return Results.Ok(krogerResults.OrderBy(x => ((dynamic)x).price).ToList());
        }
    }

    return Results.Ok(GetResults(query, lat, lng));
});

// Post a community deal
app.MapPost("/api/deals", (DealRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.ProductName) || string.IsNullOrWhiteSpace(req.StoreName) || req.Price <= 0)
        return Results.BadRequest(new { error = "productName, storeName, and price > 0 required" });
    userDeals.Add((req.ProductName.Trim(), req.StoreName.Trim(), req.Price));
    return Results.Ok(new { ok = true });
});

// Shopping list optimizer — given a list of items, find the cheapest store combination
app.MapGet("/api/list/optimize", (string[] items, string? mode, double? lat, double? lng) =>
{
    if (items.Length == 0)
        return Results.BadRequest(new { error = "At least one item is required" });

    // Get prices for every item at every store
    var priceMap = new Dictionary<string, Dictionary<string, decimal>>(); // store -> item -> price
    foreach (var item in items)
    {
        var results = GetResults(item, lat, lng);
        foreach (dynamic r in results)
        {
            string store = r.storeName;
            decimal price = r.price;
            if (!priceMap.ContainsKey(store)) priceMap[store] = new();
            // Keep the cheapest price for each item at this store
            if (!priceMap[store].ContainsKey(item) || price < priceMap[store][item])
                priceMap[store][item] = price;
        }
    }

    if (mode == "fewest_stops")
    {
        // Find the single store with the most items and lowest total
        var bestStore = priceMap
            .Where(s => s.Value.Count > 0)
            .OrderByDescending(s => s.Value.Count)
            .ThenBy(s => s.Value.Values.Sum())
            .FirstOrDefault();

        if (bestStore.Key is null)
            return Results.Ok(Array.Empty<object>());

        return Results.Ok(new[]
        {
            new
            {
                storeName = bestStore.Key,
                items = bestStore.Value.Select(kv => new { name = kv.Key, price = kv.Value }).ToArray(),
                subtotal = bestStore.Value.Values.Sum(),
                distanceMi = Dist(bestStore.Key, lat, lng),
            }
        });
    }

    // "cheapest" mode: for each item, pick the cheapest store
    var cheapestByItem = new Dictionary<string, (string store, decimal price)>();
    foreach (var item in items)
    {
        string? bestStore = null;
        decimal bestPrice = decimal.MaxValue;
        foreach (var (store, storeItems) in priceMap)
        {
            if (storeItems.TryGetValue(item, out var p) && p < bestPrice)
            {
                bestPrice = p;
                bestStore = store;
            }
        }
        if (bestStore is not null)
            cheapestByItem[item] = (bestStore, bestPrice);
    }

    // Group by store
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

record DealRequest(string ProductName, string StoreName, decimal Price);
