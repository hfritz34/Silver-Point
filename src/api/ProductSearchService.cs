namespace SilverPoint.Api;

public interface IProductSearchService
{
    Task<IReadOnlyList<PriceSearchResult>> SearchAsync(string query, double? lat, double? lng);
    IReadOnlyList<PriceSearchResult> SearchKnownPrices(string query, double? lat, double? lng);
}

public sealed class ProductSearchService(IKrogerService kroger, CommunityDealStore dealStore) : IProductSearchService
{
    static readonly (string Name, double Lat, double Lng)[] StoreCoords =
    [
        ("Walmart", 41.8500, -87.6800),
        ("Kroger", 41.8600, -87.6600),
        ("Target", 41.8700, -87.6500),
        ("CVS", 41.8450, -87.6700),
        ("Walgreens", 41.8550, -87.6900),
        ("Costco", 41.8800, -87.7200),
        ("Whole Foods", 41.8650, -87.6400),
    ];

    static readonly Dictionary<string, double> DefaultDistances = new()
    {
        ["Walmart"] = 0.8,
        ["Kroger"] = 1.1,
        ["Target"] = 1.5,
        ["CVS"] = 0.6,
        ["Walgreens"] = 0.4,
        ["Costco"] = 3.2,
        ["Whole Foods"] = 2.1,
    };

    public async Task<IReadOnlyList<PriceSearchResult>> SearchAsync(string query, double? lat, double? lng)
    {
        var normalizedQuery = query.Trim();

        if (lat is not null && lng is not null)
        {
            var locs = await kroger.GetNearbyLocationsAsync(lat.Value, lng.Value);
            if (locs.Count > 0)
            {
                var krogerResults = new List<PriceSearchResult>();
                foreach (var loc in locs)
                {
                    var products = await kroger.SearchProductsAsync(normalizedQuery, loc.LocationId);
                    if (products is null)
                    {
                        break;
                    }

                    var best = products.MinBy(p => p.Price);
                    if (best is not null)
                    {
                        var verifiedAt = DateTimeOffset.UtcNow;
                        krogerResults.Add(new PriceSearchResult(
                            best.Description,
                            loc.Name,
                            best.Price,
                            Math.Round(loc.DistMi, 1),
                            best.Stock,
                            false,
                            verifiedAt,
                            "kroger_api",
                            SearchConfidenceScorer.Score(new SearchConfidenceSignal(
                                "kroger_api",
                                false,
                                verifiedAt,
                                best.Stock))));
                    }
                }

                if (krogerResults.Count > 0)
                {
                    return krogerResults.OrderBy(x => x.Price).ToArray();
                }
            }
        }

        return SearchKnownPrices(normalizedQuery, lat, lng);
    }

    double Dist(string store, double? lat, double? lng)
    {
        if (lat is null || lng is null)
        {
            return DefaultDistances.GetValueOrDefault(store, 1.0);
        }

        var coord = StoreCoords.FirstOrDefault(s => s.Name == store);
        return coord == default ? 1.0 : Math.Round(Miles(lat.Value, lng.Value, coord.Lat, coord.Lng), 1);
    }

    static double Miles(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 3958.8;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public IReadOnlyList<PriceSearchResult> SearchKnownPrices(string query, double? lat, double? lng)
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
                    SearchConfidenceScorer.Score(new SearchConfidenceSignal(
                        "demo",
                        false,
                        null,
                        x.stock))))
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
                SearchConfidenceScorer.Score(new SearchConfidenceSignal(
                    d.Source,
                    true,
                    d.VerifiedAt,
                    "in_stock"))));

        return [.. baseResults, .. community];
    }
}
