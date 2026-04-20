namespace SilverPoint.Api;

public sealed record SearchConfidenceSignal(
    string Source,
    bool Community,
    DateTimeOffset? VerifiedAt,
    string Stock);

public static class SearchConfidenceScorer
{
    public static double Score(SearchConfidenceSignal signal, DateTimeOffset? now = null)
    {
        var score = signal.Source switch
        {
            "kroger_api" => 0.88,
            "receipt" => 0.86,
            "vendor" => 0.84,
            "manual" => 0.72,
            "community" => 0.72,
            "demo" => 0.58,
            _ => signal.Community ? 0.68 : 0.62,
        };

        if (signal.VerifiedAt is not null)
        {
            score += FreshnessAdjustment(signal.VerifiedAt.Value, now ?? DateTimeOffset.UtcNow);
        }

        score += signal.Stock switch
        {
            "in_stock" => 0.03,
            "low_stock" => -0.02,
            "out_of_stock" => -0.08,
            _ => -0.03,
        };

        if (signal.Community && signal.VerifiedAt is null)
        {
            score -= 0.06;
        }

        return Math.Round(Math.Clamp(score, 0.1, 0.99), 2);
    }

    static double FreshnessAdjustment(DateTimeOffset verifiedAt, DateTimeOffset now)
    {
        var age = now - verifiedAt;

        if (age < TimeSpan.Zero)
        {
            return 0.02;
        }

        if (age <= TimeSpan.FromHours(24))
        {
            return 0.08;
        }

        if (age <= TimeSpan.FromDays(7))
        {
            return 0.03;
        }

        if (age <= TimeSpan.FromDays(30))
        {
            return -0.04;
        }

        return -0.12;
    }
}
