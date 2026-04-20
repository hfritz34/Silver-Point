using SilverPoint.Api;

namespace SilverPoint.Api.Tests;

public sealed class CommunityDealStoreTests : IDisposable
{
    readonly string _tempDir = Path.Combine(Path.GetTempPath(), $"silverpoint-tests-{Guid.NewGuid():N}");

    [Fact]
    public void AddPersistsDealWithMetadata()
    {
        var storePath = StorePath();
        var store = new CommunityDealStore(storePath);

        var deal = store.Add(new DealRequest("  Milk  ", "  Kroger  ", 3.456m, "receipt"));

        Assert.NotEqual(Guid.Empty, deal.Id);
        Assert.Equal("Milk", deal.ProductName);
        Assert.Equal("Kroger", deal.StoreName);
        Assert.Equal(3.46m, deal.Price);
        Assert.Equal("receipt", deal.Source);
        Assert.True(deal.VerifiedAt > DateTimeOffset.UtcNow.AddMinutes(-1));

        var reloaded = new CommunityDealStore(storePath);
        Assert.Equal(deal, Assert.Single(reloaded.GetAll()));
    }

    [Fact]
    public void AddNormalizesUnknownSourceToCommunity()
    {
        var store = new CommunityDealStore(StorePath());

        var deal = store.Add(new DealRequest("Eggs", "Corner Market", 4.99m, "flyer"));

        Assert.Equal("community", deal.Source);
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
}
