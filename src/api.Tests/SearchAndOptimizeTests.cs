using SilverPoint.Api;

namespace SilverPoint.Api.Tests;

public sealed class SearchAndOptimizeTests : IDisposable
{
    readonly string _tempDir = Path.Combine(Path.GetTempPath(), $"silverpoint-tests-{Guid.NewGuid():N}");

    [Fact]
    public async Task SearchAsync_FallsBackToDemoAndCommunityResults()
    {
        var store = new CommunityDealStore(StorePath());
        store.Add(new DealRequest("Milk", "Corner Market", 1.79m, "receipt"));

        var service = new ProductSearchService(new FakeKrogerService(), store);

        var results = await service.SearchAsync("milk", null, null);

        Assert.Equal("Walmart", results[0].StoreName);
        Assert.Equal("demo", results[0].Source);
        Assert.Contains(results, result => result.StoreName == "Walmart" && result.Source == "demo");
        Assert.Contains(results, result => result.StoreName == "Corner Market" && result.Community && result.Source == "receipt");
    }

    [Fact]
    public async Task SearchAsync_UsesKrogerWhenNearbyDataIsAvailable()
    {
        var service = new ProductSearchService(
            new FakeKrogerService(
                [("loc-1", "Kroger", 2.25)],
                [new KrogerResult("Kroger Milk Value Pack", 4.25m, "low_stock"), new KrogerResult("Kroger Milk Premium", 6.25m, "in_stock")]),
            new CommunityDealStore(StorePath()));

        var results = await service.SearchAsync("milk", 41.88, -87.62);

        Assert.Single(results);
        Assert.Equal("Kroger Milk Value Pack", results[0].ProductName);
        Assert.Equal("Kroger", results[0].StoreName);
        Assert.Equal(4.25m, results[0].Price);
        Assert.Equal("kroger_api", results[0].Source);
        Assert.False(results[0].Community);
        Assert.True(results[0].VerifiedAt is not null);
    }

    [Fact]
    public async Task SearchAsync_DoesNotOrderFallbackResultsByConfidence()
    {
        var store = new CommunityDealStore(StorePath());
        store.Add(new DealRequest("Milk", "Corner Market", 1.79m, "receipt"));

        var service = new ProductSearchService(new FakeKrogerService(), store);

        var results = await service.SearchAsync("milk", null, null);

        var communityResultIndex = results.ToList().FindIndex(result => result.StoreName == "Corner Market");
        var highestDemoPriceIndex = results.ToList().FindIndex(result => result.StoreName == "Walgreens");

        Assert.True(communityResultIndex > highestDemoPriceIndex);
        Assert.True(results[communityResultIndex].Confidence > results[highestDemoPriceIndex].Confidence);
    }

    [Fact]
    public async Task OptimizeAsync_DefaultModeGroupsCheapestByStore()
    {
        var optimizer = new ShoppingListOptimizerService(
            new FakeProductSearchService(
                new Dictionary<string, IReadOnlyList<PriceSearchResult>>
                {
                    ["milk"] = [
                        new PriceSearchResult("milk", "Walmart", 2m, 0.8, "in_stock", false, null, "demo", 0.7),
                        new PriceSearchResult("milk", "Target", 1.5m, 1.5, "in_stock", false, null, "demo", 0.7),
                    ],
                    ["eggs"] = [
                        new PriceSearchResult("eggs", "Walmart", 4m, 0.8, "in_stock", false, null, "demo", 0.7),
                        new PriceSearchResult("eggs", "Target", 5m, 1.5, "in_stock", false, null, "demo", 0.7),
                    ],
                }));

        var results = await optimizer.OptimizeAsync(["milk", "eggs"], null, null, null);

        Assert.Equal(2, results.Count);
        Assert.Equal("Walmart", results[0].StoreName);
        Assert.Single(results[0].Items);
        Assert.Equal("eggs", results[0].Items[0].Name);
        Assert.Equal(4m, results[0].Items[0].Price);
        Assert.Equal(4m, results[0].Subtotal);
        Assert.Equal("Target", results[1].StoreName);
        Assert.Single(results[1].Items);
        Assert.Equal("milk", results[1].Items[0].Name);
        Assert.Equal(1.5m, results[1].Items[0].Price);
    }

    [Fact]
    public async Task OptimizeAsync_FewestStopsSelectsStoreWithMostItems()
    {
        var optimizer = new ShoppingListOptimizerService(
            new FakeProductSearchService(
                new Dictionary<string, IReadOnlyList<PriceSearchResult>>
                {
                    ["milk"] = [
                        new PriceSearchResult("milk", "Store A", 10m, 1, "in_stock", false, null, "demo", 0.7),
                        new PriceSearchResult("milk", "Store B", 1m, 2, "in_stock", false, null, "demo", 0.7),
                    ],
                    ["eggs"] = [
                        new PriceSearchResult("eggs", "Store A", 11m, 1, "in_stock", false, null, "demo", 0.7),
                    ],
                }));

        var results = await optimizer.OptimizeAsync(["milk", "eggs"], "fewest_stops", null, null);

        Assert.Single(results);
        Assert.Equal("Store A", results[0].StoreName);
        Assert.Equal(2, results[0].Items.Length);
        Assert.Equal(21m, results[0].Subtotal);
    }

    [Fact]
    public void SearchConfidenceScorer_BoundsScores()
    {
        var signals = new[]
        {
            new SearchConfidenceSignal("demo", false, null, "out_of_stock"),
            new SearchConfidenceSignal("receipt", true, DateTimeOffset.UtcNow, "in_stock"),
            new SearchConfidenceSignal("unknown", true, DateTimeOffset.UtcNow.AddYears(-1), "unknown"),
        };

        foreach (var signal in signals)
        {
            var score = SearchConfidenceScorer.Score(signal);

            Assert.InRange(score, 0, 1);
        }
    }

    [Fact]
    public void SearchConfidenceScorer_ScoresLiveRetailerAboveDemo()
    {
        var now = DateTimeOffset.UtcNow;

        var retailer = SearchConfidenceScorer.Score(
            new SearchConfidenceSignal("kroger_api", false, now, "in_stock"),
            now);
        var demo = SearchConfidenceScorer.Score(
            new SearchConfidenceSignal("demo", false, null, "in_stock"),
            now);

        Assert.True(retailer > demo);
    }

    [Fact]
    public void SearchConfidenceScorer_RewardsFreshCommunityVerification()
    {
        var now = DateTimeOffset.UtcNow;

        var freshReceipt = SearchConfidenceScorer.Score(
            new SearchConfidenceSignal("receipt", true, now.AddHours(-2), "in_stock"),
            now);
        var staleManual = SearchConfidenceScorer.Score(
            new SearchConfidenceSignal("manual", true, now.AddDays(-45), "in_stock"),
            now);

        Assert.True(freshReceipt > staleManual);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    string StorePath()
    {
        Directory.CreateDirectory(_tempDir);
        return Path.Combine(_tempDir, "community-deals.json");
    }

    sealed class FakeKrogerService(
        List<(string LocationId, string Name, double DistMi)>? locations = null,
        List<KrogerResult>? products = null) : IKrogerService
    {
        readonly List<(string LocationId, string Name, double DistMi)> _locations = locations ?? [];
        readonly List<KrogerResult>? _products = products;

        public Task<List<(string LocationId, string Name, double DistMi)>> GetNearbyLocationsAsync(double lat, double lng) =>
            Task.FromResult(_locations.ToList());

        public Task<List<KrogerResult>?> SearchProductsAsync(string query, string locationId) =>
            Task.FromResult(_products?.ToList());
    }

    sealed class FakeProductSearchService(Dictionary<string, IReadOnlyList<PriceSearchResult>> results) : IProductSearchService
    {
        public Task<IReadOnlyList<PriceSearchResult>> SearchAsync(string query, double? lat, double? lng) =>
            throw new InvalidOperationException("List optimization should use known local prices, not live retailer search.");

        public IReadOnlyList<PriceSearchResult> SearchKnownPrices(string query, double? lat, double? lng) =>
            results.TryGetValue(query, out var value) ? value : Array.Empty<PriceSearchResult>();
    }
}
