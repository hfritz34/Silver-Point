using System.Text.Json;

namespace SilverPoint.Api;

public sealed class CommunityDealStore
{
    static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    readonly object _gate = new();
    readonly string _storagePath;
    readonly List<CommunityDeal> _deals;

    public CommunityDealStore(IConfiguration config, IWebHostEnvironment env)
        : this(ResolveStoragePath(config, env))
    {
    }

    internal CommunityDealStore(string storagePath)
    {
        _storagePath = storagePath;
        _deals = LoadDeals(storagePath);
    }

    public IReadOnlyList<CommunityDeal> GetAll()
    {
        lock (_gate)
        {
            return _deals
                .OrderByDescending(deal => deal.VerifiedAt)
                .ToArray();
        }
    }

    public CommunityDeal Add(DealRequest request)
    {
        var deal = new CommunityDeal(
            Guid.NewGuid(),
            request.ProductName.Trim(),
            request.StoreName.Trim(),
            decimal.Round(request.Price, 2),
            DateTimeOffset.UtcNow,
            NormalizeSource(request.Source));

        lock (_gate)
        {
            _deals.Add(deal);
            SaveDeals();
        }

        return deal;
    }

    static string ResolveStoragePath(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["CommunityDeals:StoragePath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.IsPathRooted(configured)
                ? configured
                : Path.Combine(env.ContentRootPath, configured);
        }

        return Path.Combine(env.ContentRootPath, "Data", "community-deals.json");
    }

    static string NormalizeSource(string? source)
    {
        var normalized = source?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "receipt" => "receipt",
            "vendor" => "vendor",
            "manual" => "manual",
            _ => "community",
        };
    }

    static List<CommunityDeal> LoadDeals(string storagePath)
    {
        if (!File.Exists(storagePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(storagePath);
            return JsonSerializer.Deserialize<List<CommunityDeal>>(json, JsonOptions)?
                .Where(deal => deal.Price > 0
                    && !string.IsNullOrWhiteSpace(deal.ProductName)
                    && !string.IsNullOrWhiteSpace(deal.StoreName))
                .ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

    void SaveDeals()
    {
        var directory = Path.GetDirectoryName(_storagePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = $"{_storagePath}.tmp";
        File.WriteAllText(tempPath, JsonSerializer.Serialize(_deals, JsonOptions));
        File.Move(tempPath, _storagePath, true);
    }
}

public sealed record DealRequest(
    string ProductName,
    string StoreName,
    decimal Price,
    string? Source = null);

public sealed record CommunityDeal(
    Guid Id,
    string ProductName,
    string StoreName,
    decimal Price,
    DateTimeOffset VerifiedAt,
    string Source);

public sealed record PriceSearchResult(
    string ProductName,
    string StoreName,
    decimal Price,
    double DistanceMi,
    string Stock,
    bool Community,
    DateTimeOffset? VerifiedAt,
    string Source,
    double Confidence);
