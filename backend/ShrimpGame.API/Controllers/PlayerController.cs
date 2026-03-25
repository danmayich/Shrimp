using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShrimpGame.API.Models;
using ShrimpGame.API.Services;
using System.Security.Claims;

namespace ShrimpGame.API.Controllers;

[ApiController]
[Route("api/player")]
[Authorize]
public class PlayerController : ControllerBase
{
    private readonly PlayerService _players;
    private readonly AuthService _auth;

    public PlayerController(PlayerService players, AuthService auth)
    {
        _players = players;
        _auth = auth;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var (id, username) = GetClaims();
        if (id is null) return Unauthorized();

        var profile = await _players.GetOrCreateProfileAsync(id, username ?? "Player");
        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> SaveProfile([FromBody] PlayerProfile profile)
    {
        var (id, _) = GetClaims();
        if (id is null || profile.Id != id)
            return Unauthorized(new { message = "Profile ID mismatch." });

        // Sanity check cash ceiling to prevent client-side manipulation
        if (profile.Cash > 10_000_000)
            return BadRequest(new { message = "Invalid cash value." });

        await _players.SaveProfileAsync(profile);
        return Ok(profile);
    }

    [HttpPost("purchase")]
    public IActionResult Purchase([FromBody] PurchaseRequest req)
    {
        var (id, _) = GetClaims();
        if (id is null) return Unauthorized();
        return Ok(new { success = true });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private (string? id, string? username) GetClaims()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub");
        var username = User.FindFirstValue(ClaimTypes.Name)
                     ?? User.FindFirstValue("unique_name");
        return (id, username);
    }
}
