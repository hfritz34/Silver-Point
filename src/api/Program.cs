var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health for load balancers and CI
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Demo search: mock results for any query (optional lat/lng for future geo)
app.MapGet("/api/search", (string? q, double? lat, double? lng) =>
{
    var query = q?.Trim() ?? "item";
    var mock = new[]
    {
        new { productName = query, storeName = "Store A", price = 2.99m, distanceMi = 0.5 },
        new { productName = query, storeName = "Store B", price = 2.49m, distanceMi = 1.2 },
        new { productName = query, storeName = "Store C", price = 3.19m, distanceMi = 0.8 }
    };
    return Results.Ok(mock);
});

app.Run();
