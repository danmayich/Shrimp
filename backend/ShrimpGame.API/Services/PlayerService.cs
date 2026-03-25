using ShrimpGame.API.Models;

namespace ShrimpGame.API.Services;

public class PlayerService
{
    private readonly JsonStorageService _storage;

    public PlayerService(JsonStorageService storage)
    {
        _storage = storage;
    }

    public async Task<PlayerProfile> GetOrCreateProfileAsync(string userId, string username)
    {
        var existing = await _storage.ReadAsync<PlayerProfile>(userId);
        if (existing is not null) return existing;

        var profile = new PlayerProfile
        {
            Id = userId,
            Username = username,
            Cash = 1000m,
        };
        await _storage.WriteAsync(userId, profile);
        return profile;
    }

    public async Task<PlayerProfile?> GetProfileAsync(string userId)
        => await _storage.ReadAsync<PlayerProfile>(userId);

    public async Task SaveProfileAsync(PlayerProfile profile)
    {
        profile.LastSavedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await _storage.WriteAsync(profile.Id, profile);
    }

    public async Task<bool> DeductCashAsync(string userId, decimal amount)
    {
        var profile = await _storage.ReadAsync<PlayerProfile>(userId);
        if (profile is null || profile.Cash < amount) return false;
        profile.Cash -= amount;
        await SaveProfileAsync(profile);
        return true;
    }

    public async Task AddCashAsync(string userId, decimal amount)
    {
        var profile = await _storage.ReadAsync<PlayerProfile>(userId);
        if (profile is null) return;
        profile.Cash += amount;
        await SaveProfileAsync(profile);
    }
}
