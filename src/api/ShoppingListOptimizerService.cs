namespace SilverPoint.Api;

public interface IShoppingListOptimizerService
{
    Task<IReadOnlyList<ListOptimizationStoreResult>> OptimizeAsync(string[] items, string? mode, double? lat, double? lng);
}

public sealed class ShoppingListOptimizerService(IProductSearchService productSearchService) : IShoppingListOptimizerService
{
    public Task<IReadOnlyList<ListOptimizationStoreResult>> OptimizeAsync(string[] items, string? mode, double? lat, double? lng)
    {
        var priceMap = new Dictionary<string, Dictionary<string, decimal>>();
        var storeDistances = new Dictionary<string, double>();
        foreach (var item in items)
        {
            var results = productSearchService.SearchKnownPrices(item, lat, lng);
            foreach (var result in results)
            {
                if (!priceMap.ContainsKey(result.StoreName))
                {
                    priceMap[result.StoreName] = [];
                }

                storeDistances.TryAdd(result.StoreName, result.DistanceMi);

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
                return Task.FromResult<IReadOnlyList<ListOptimizationStoreResult>>(Array.Empty<ListOptimizationStoreResult>());
            }

            return Task.FromResult<IReadOnlyList<ListOptimizationStoreResult>>(
            [
                new ListOptimizationStoreResult(
                    bestStore.Key,
                    [.. bestStore.Value.Select(kv => new ListOptimizationItem(kv.Key, kv.Value))],
                    bestStore.Value.Values.Sum(),
                    storeDistances.GetValueOrDefault(bestStore.Key, 1.0))
            ]);
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
            .Select(g => new ListOptimizationStoreResult(
                g.Key,
                [.. g.Select(kv => new ListOptimizationItem(kv.Key, kv.Value.price))],
                g.Sum(kv => kv.Value.price),
                storeDistances.GetValueOrDefault(g.Key, 1.0)))
            .OrderBy(r => r.DistanceMi)
            .ToArray();

        return Task.FromResult<IReadOnlyList<ListOptimizationStoreResult>>(grouped);
    }
}

public sealed record ListOptimizationItem(string Name, decimal Price);

public sealed record ListOptimizationStoreResult(
    string StoreName,
    ListOptimizationItem[] Items,
    decimal Subtotal,
    double DistanceMi);
