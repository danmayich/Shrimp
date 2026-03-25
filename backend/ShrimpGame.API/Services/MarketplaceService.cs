using ShrimpGame.API.Models;

namespace ShrimpGame.API.Services;

public class MarketplaceService
{
    private readonly JsonStorageService _storage;
    private const string MarketKey = "marketplace";

    public MarketplaceService(JsonStorageService storage)
    {
        _storage = storage;
    }

    public async Task<List<MarketListing>> GetActiveListingsAsync()
    {
        var all = await _storage.ReadAsync<List<MarketListing>>(MarketKey) ?? [];
        return all.Where(l => !l.Sold).OrderByDescending(l => l.ListedAt).ToList();
    }

    public async Task<MarketListing> CreateListingAsync(string sellerId, string sellerName, CreateListingRequest req)
    {
        if (req.Price <= 0 || req.Price > 99_999)
            throw new ArgumentException("Price must be between $1 and $99,999.");
        if (string.IsNullOrWhiteSpace(req.VariantId))
            throw new ArgumentException("VariantId is required.");
        if (req.Notes is not null && req.Notes.Length > 200)
            throw new ArgumentException("Notes must be under 200 characters.");

        var listing = new MarketListing
        {
            SellerId   = sellerId,
            SellerName = sellerName,
            VariantId  = req.VariantId,
            VariantName = req.VariantName,
            Price = req.Price,
            Sex = req.Sex,
            Grade = req.Grade,
            AgeGameDays = req.AgeGameDays,
            Notes = req.Notes,
        };

        var all = await _storage.ReadAsync<List<MarketListing>>(MarketKey) ?? [];
        all.Add(listing);
        await _storage.WriteAsync(MarketKey, all);
        return listing;
    }

    public async Task<MarketListing?> BuyListingAsync(string listingId, string buyerId)
    {
        var all = await _storage.ReadAsync<List<MarketListing>>(MarketKey) ?? [];
        var listing = all.FirstOrDefault(l => l.Id == listingId);
        if (listing is null || listing.Sold)
            return null;

        // Prevent self-purchase
        if (listing.SellerId == buyerId)
            throw new InvalidOperationException("Cannot buy your own listing.");

        listing.Sold = true;
        listing.BuyerId = buyerId;
        listing.SoldAt = DateTime.UtcNow;
        await _storage.WriteAsync(MarketKey, all);
        return listing;
    }

    public async Task<bool> DeleteListingAsync(string listingId, string requesterId)
    {
        var all = await _storage.ReadAsync<List<MarketListing>>(MarketKey) ?? [];
        var listing = all.FirstOrDefault(l => l.Id == listingId);
        if (listing is null) return false;
        if (listing.SellerId != requesterId)
            throw new UnauthorizedAccessException("Cannot delete another player's listing.");
        if (listing.Sold) return false;

        all.Remove(listing);
        await _storage.WriteAsync(MarketKey, all);
        return true;
    }
}
