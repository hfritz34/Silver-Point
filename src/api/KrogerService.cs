using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SilverPoint.Api;

/// <summary>
/// Wraps the official Kroger Developer API (developer.kroger.com).
/// Register at https://developer.kroger.com to get ClientId and ClientSecret.
/// Set them in appsettings.json under "Kroger:ClientId" / "Kroger:ClientSecret".
/// When credentials are absent the service returns null and the caller falls back to mock data.
/// </summary>
public class KrogerService(IConfiguration config, IHttpClientFactory http)
{
    const string TokenUrl  = "https://api.kroger.com/v1/connect/oauth2/token";
    const string LocUrl    = "https://api.kroger.com/v1/locations";
    const string ProdUrl   = "https://api.kroger.com/v1/products";

    string? _token;
    DateTime _tokenExpiry = DateTime.MinValue;

    bool IsConfigured =>
        !string.IsNullOrWhiteSpace(config["Kroger:ClientId"]) &&
        !string.IsNullOrWhiteSpace(config["Kroger:ClientSecret"]);

    async Task<string?> GetTokenAsync()
    {
        if (!IsConfigured) return null;
        if (_token is not null && DateTime.UtcNow < _tokenExpiry) return _token;

        var client = http.CreateClient();
        var creds  = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{config["Kroger:ClientId"]}:{config["Kroger:ClientSecret"]}"));

        var req = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["scope"]      = "product.compact",
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", creds);

        var res = await client.SendAsync(req);
        if (!res.IsSuccessStatusCode) return null;

        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        _token = doc.RootElement.GetProperty("access_token").GetString();
        var expiresIn = doc.RootElement.GetProperty("expires_in").GetInt32();
        _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 60);
        return _token;
    }

    /// <summary>
    /// Returns nearby Kroger location IDs for a given lat/lng.
    /// </summary>
    public async Task<List<(string LocationId, string Name, double DistMi)>> GetNearbyLocationsAsync(double lat, double lng)
    {
        var token = await GetTokenAsync();
        if (token is null) return [];

        var client = http.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var url = $"{LocUrl}?filter.latLong={lat},{lng}&filter.radiusInMiles=10&filter.limit=5";
        var res = await client.GetAsync(url);
        if (!res.IsSuccessStatusCode) return [];

        var doc  = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var locs = new List<(string, string, double)>();

        foreach (var loc in doc.RootElement.GetProperty("data").EnumerateArray())
        {
            var id   = loc.GetProperty("locationId").GetString() ?? "";
            var name = loc.GetProperty("name").GetString() ?? "Kroger";
            var dist = loc.TryGetProperty("geolocation", out var geo)
                ? geo.TryGetProperty("latLng", out _) ? 0.0 : 0.0
                : 0.0;
            locs.Add((id, name, dist));
        }
        return locs;
    }

    /// <summary>
    /// Searches products at a given Kroger location. Returns null when Kroger is unconfigured.
    /// </summary>
    public async Task<List<KrogerResult>?> SearchProductsAsync(string query, string locationId)
    {
        var token = await GetTokenAsync();
        if (token is null) return null;

        var client = http.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var q   = Uri.EscapeDataString(query);
        var url = $"{ProdUrl}?filter.term={q}&filter.locationId={locationId}&filter.limit=5";
        var res = await client.GetAsync(url);
        if (!res.IsSuccessStatusCode) return null;

        var doc     = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var results = new List<KrogerResult>();

        foreach (var item in doc.RootElement.GetProperty("data").EnumerateArray())
        {
            var desc = item.GetProperty("description").GetString() ?? query;

            decimal price = 0;
            string  stock = "in_stock";

            if (item.TryGetProperty("items", out var items) && items.GetArrayLength() > 0)
            {
                var first = items[0];
                if (first.TryGetProperty("price", out var priceEl))
                    price = priceEl.TryGetProperty("regular", out var reg)
                            ? reg.GetDecimal()
                            : price;

                if (first.TryGetProperty("inventory", out var inv) &&
                    inv.TryGetProperty("stockLevel", out var sl))
                {
                    stock = sl.GetString() switch
                    {
                        "TEMPORARILY_OUT_OF_STOCK" => "out_of_stock",
                        "LOW"                      => "low_stock",
                        _                          => "in_stock",
                    };
                }
            }

            if (price > 0)
                results.Add(new KrogerResult(desc, price, stock));
        }

        return results;
    }
}

public record KrogerResult(string Description, decimal Price, string Stock);
