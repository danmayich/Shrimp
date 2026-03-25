namespace ShrimpGame.API.Models;

public class MarketListing
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SellerId { get; set; } = string.Empty;
    public string SellerName { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Sex { get; set; }
    public string? Grade { get; set; }
    public double AgeGameDays { get; set; }
    public string? Notes { get; set; }
    public bool Sold { get; set; }
    public string? BuyerId { get; set; }
    public DateTime ListedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SoldAt { get; set; }
}

public class CreateListingRequest
{
    public string VariantId { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Sex { get; set; }
    public string? Grade { get; set; }
    public double AgeGameDays { get; set; }
    public string? Notes { get; set; }
}

public class PurchaseRequest
{
    public string ItemId { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
}
