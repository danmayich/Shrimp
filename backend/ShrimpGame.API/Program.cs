using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ShrimpGame.API.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddControllers();

// CORS — allow Vite dev server and production origin
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",  // Vite dev
                "http://localhost:4173"   // Vite preview
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

// Data storage services
var dataRoot = Path.Combine(builder.Environment.ContentRootPath, "Data");

builder.Services.AddSingleton(_ =>
    new JsonStorageService(Path.Combine(dataRoot, "users")));

builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<PlayerService>(_ =>
    new PlayerService(
        new JsonStorageService(Path.Combine(dataRoot, "players"))
    ));
builder.Services.AddSingleton<MarketplaceService>(_ =>
    new MarketplaceService(
        new JsonStorageService(Path.Combine(dataRoot, "marketplace"))
    ));

// ── App pipeline ──────────────────────────────────────────────────────────────

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();


app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
