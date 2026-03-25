using ShrimpGame.API.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ShrimpGame.API.Services;

public class AuthService
{
    private readonly JsonStorageService _userStorage;
    private readonly IConfiguration _config;

    public AuthService(JsonStorageService userStorage, IConfiguration config)
    {
        _userStorage = userStorage;
        _config = config;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req)
    {
        // Validate input length to prevent excessively large payloads
        if (string.IsNullOrWhiteSpace(req.Username) || req.Username.Length > 32)
            throw new ArgumentException("Username must be 1–32 characters.");
        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6 || req.Password.Length > 128)
            throw new ArgumentException("Password must be 6–128 characters.");
        if (req.Email is not null && req.Email.Length > 254)
            throw new ArgumentException("Email too long.");

        // Check if username already taken
        var existing = await FindByUsernameAsync(req.Username);
        if (existing is not null)
            throw new InvalidOperationException("Username already taken.");

        var user = new ApplicationUser
        {
            Username = req.Username.Trim(),
            Email = req.Email?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };

        await _userStorage.WriteAsync(user.Id, user);
        return BuildResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            throw new ArgumentException("Username and password are required.");

        var user = await FindByUsernameAsync(req.Username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials.");

        return BuildResponse(user);
    }

    public async Task<ApplicationUser?> GetByIdAsync(string id)
    {
        // Validate id format to prevent path traversal (storage service also sanitizes, belt-and-suspenders)
        if (string.IsNullOrWhiteSpace(id) || id.Length > 64)
            return null;
        return await _userStorage.ReadAsync<ApplicationUser>(id);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<ApplicationUser?> FindByUsernameAsync(string username)
    {
        var all = await _userStorage.ReadAllAsync<ApplicationUser>();
        return all.FirstOrDefault(u =>
            string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase));
    }

    private AuthResponse BuildResponse(ApplicationUser user)
    {
        var token = GenerateToken(user);
        return new AuthResponse
        {
            Token = token,
            User = new UserDto { Id = user.Id, Username = user.Username, Email = user.Email },
        };
    }

    private string GenerateToken(ApplicationUser user)
    {
        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured");
        var secKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(secKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:   _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
