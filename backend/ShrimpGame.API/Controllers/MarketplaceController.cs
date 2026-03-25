using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShrimpGame.API.Models;
using ShrimpGame.API.Services;
using System.Security.Claims;

namespace ShrimpGame.API.Controllers;

[ApiController]
[Route("api/marketplace")]
public class MarketplaceController : ControllerBase
{
    private readonly MarketplaceService _market;
    private readonly PlayerService _players;

    public MarketplaceController(MarketplaceService market, PlayerService players)
    {
        _market = market;
        _players = players;
    }

    [HttpGet]
    public async Task<IActionResult> GetListings()
    {
        var listings = await _market.GetActiveListingsAsync();
        return Ok(listings);
    }

    [Authorize]
    [HttpPost("list")]
    public async Task<IActionResult> CreateListing([FromBody] CreateListingRequest req)
    {
        var (id, username) = GetClaims();
        if (id is null) return Unauthorized();

        try
        {
            var listing = await _market.CreateListingAsync(id, username ?? "Unknown", req);

            // Credit seller when listing is created (pay on listing — simpler UX)
            await _players.AddCashAsync(id, listing.Price);
            return Ok(listing);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("buy/{listingId}")]
    public async Task<IActionResult> BuyListing(string listingId)
    {
        var (id, _) = GetClaims();
        if (id is null) return Unauthorized();

        try
        {
            var listing = await _market.BuyListingAsync(listingId, id);
            if (listing is null)
                return NotFound(new { message = "Listing not found or already sold." });

            // Deduct cash from buyer
            var success = await _players.DeductCashAsync(id, listing.Price);
            if (!success)
                return BadRequest(new { message = "Insufficient funds." });

            return Ok(listing);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("{listingId}")]
    public async Task<IActionResult> DeleteListing(string listingId)
    {
        var (id, _) = GetClaims();
        if (id is null) return Unauthorized();

        try
        {
            var deleted = await _market.DeleteListingAsync(listingId, id);
            if (!deleted) return NotFound(new { message = "Listing not found." });
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private (string? id, string? username) GetClaims()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub");
        var username = User.FindFirstValue(ClaimTypes.Name)
                     ?? User.FindFirstValue("unique_name");
        return (id, username);
    }
}
