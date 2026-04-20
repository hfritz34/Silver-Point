using SilverPoint.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IKrogerService, KrogerService>();
builder.Services.AddSingleton<CommunityDealStore>();
builder.Services.AddSingleton<IProductSearchService, ProductSearchService>();
builder.Services.AddSingleton<IShoppingListOptimizerService, ShoppingListOptimizerService>();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health for load balancers and CI
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Search endpoint tries Kroger live data first, then falls back to demo and community data.
app.MapGet("/api/search", async (string? q, double? lat, double? lng, IProductSearchService searchService) =>
    Results.Ok(await searchService.SearchAsync(q?.Trim() ?? "", lat, lng)));

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
app.MapGet("/api/list/optimize", async (string[] items, string? mode, double? lat, double? lng, IShoppingListOptimizerService optimizer) =>
{
    if (items.Length == 0)
    {
        return Results.BadRequest(new { error = "At least one item is required" });
    }

    return Results.Ok(await optimizer.OptimizeAsync(items, mode, lat, lng));
});

app.Run();
