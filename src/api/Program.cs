var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Health for load balancers and CI
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Mock datasets keyed by product keyword; results sorted by price asc
var mockData = new Dictionary<string, object[]>
{
    ["milk"] =
    [
        new { productName = "milk", storeName = "Walmart",   price = 2.49m, distanceMi = 0.8,  stock = "in_stock"    },
        new { productName = "milk", storeName = "Kroger",    price = 2.79m, distanceMi = 1.1,  stock = "in_stock"    },
        new { productName = "milk", storeName = "Target",    price = 3.19m, distanceMi = 1.5,  stock = "in_stock"    },
        new { productName = "milk", storeName = "CVS",       price = 3.49m, distanceMi = 0.6,  stock = "low_stock"   },
        new { productName = "milk", storeName = "Walgreens", price = 3.89m, distanceMi = 0.4,  stock = "in_stock"    },
    ],
    ["formula"] =
    [
        new { productName = "infant formula", storeName = "Walmart",   price = 18.99m, distanceMi = 0.8, stock = "low_stock"    },
        new { productName = "infant formula", storeName = "Target",    price = 22.49m, distanceMi = 1.5, stock = "in_stock"     },
        new { productName = "infant formula", storeName = "Kroger",    price = 24.99m, distanceMi = 1.1, stock = "out_of_stock" },
        new { productName = "infant formula", storeName = "CVS",       price = 26.99m, distanceMi = 0.4, stock = "in_stock"     },
        new { productName = "infant formula", storeName = "Walgreens", price = 27.49m, distanceMi = 0.6, stock = "in_stock"     },
    ],
    ["eggs"] =
    [
        new { productName = "eggs", storeName = "Walmart",    price = 3.49m, distanceMi = 0.8, stock = "in_stock"  },
        new { productName = "eggs", storeName = "Kroger",     price = 3.99m, distanceMi = 1.1, stock = "in_stock"  },
        new { productName = "eggs", storeName = "Costco",     price = 4.99m, distanceMi = 3.2, stock = "in_stock"  },
        new { productName = "eggs", storeName = "Target",     price = 5.49m, distanceMi = 1.5, stock = "low_stock" },
        new { productName = "eggs", storeName = "Whole Foods",price = 6.99m, distanceMi = 2.1, stock = "in_stock"  },
    ],
    ["ibuprofen"] =
    [
        new { productName = "ibuprofen", storeName = "Walmart",   price = 4.99m,  distanceMi = 0.8, stock = "in_stock" },
        new { productName = "ibuprofen", storeName = "Kroger",    price = 6.49m,  distanceMi = 1.1, stock = "in_stock" },
        new { productName = "ibuprofen", storeName = "Target",    price = 7.99m,  distanceMi = 1.5, stock = "in_stock" },
        new { productName = "ibuprofen", storeName = "CVS",       price = 9.99m,  distanceMi = 0.4, stock = "in_stock" },
        new { productName = "ibuprofen", storeName = "Walgreens", price = 12.99m, distanceMi = 0.6, stock = "in_stock" },
    ],
    ["diapers"] =
    [
        new { productName = "diapers", storeName = "Walmart", price = 22.99m, distanceMi = 0.8, stock = "in_stock"  },
        new { productName = "diapers", storeName = "Costco",  price = 24.99m, distanceMi = 3.2, stock = "in_stock"  },
        new { productName = "diapers", storeName = "Target",  price = 26.99m, distanceMi = 1.5, stock = "in_stock"  },
        new { productName = "diapers", storeName = "Kroger",  price = 29.49m, distanceMi = 1.1, stock = "low_stock" },
        new { productName = "diapers", storeName = "CVS",     price = 34.99m, distanceMi = 0.4, stock = "in_stock"  },
    ],
};

object[] GetResults(string query)
{
    var q = query.ToLower();
    if (q.Contains("formula") || q.Contains("infant")) return mockData["formula"];
    foreach (var key in mockData.Keys)
        if (q.Contains(key)) return mockData[key];
    // Fallback
    return
    [
        new { productName = query, storeName = "Walmart", price = 5.99m, distanceMi = 0.8, stock = "in_stock" },
        new { productName = query, storeName = "Target",  price = 7.49m, distanceMi = 1.5, stock = "in_stock" },
        new { productName = query, storeName = "CVS",     price = 8.99m, distanceMi = 0.4, stock = "in_stock" },
    ];
}

// Demo search: keyword-matched mock results (lat/lng reserved for future geo)
app.MapGet("/api/search", (string? q, double? lat, double? lng) =>
    Results.Ok(GetResults(q?.Trim() ?? "")));

app.Run();
