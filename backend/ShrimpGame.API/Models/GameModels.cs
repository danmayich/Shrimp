namespace ShrimpGame.API.Models;

// ── Player profile stored per-user as JSON ─────────────────────────────────────

public class PlayerProfile
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public decimal Cash { get; set; } = 1000m;
    public List<InventoryItem> Inventory { get; set; } = [];
    public List<TankState> Tanks { get; set; } = [];
    public string? ActiveTankId { get; set; }
    public int GameSpeedMultiplier { get; set; } = 1;
    public long LastSavedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

public class InventoryItem
{
    public string ItemId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public long AcquiredAt { get; set; }
}

// ── Tank ──────────────────────────────────────────────────────────────────────

public class TankState
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OwnerId { get; set; } = string.Empty;
    public int Gallons { get; set; }
    public string SubstrateType { get; set; } = "none";
    public double SubstrateAgeMonths { get; set; }
    public bool Cycled { get; set; }
    public double CyclingDaysElapsed { get; set; }
    public double BacteriaLevel { get; set; }
    public string FilterType { get; set; } = "none";
    public bool HasHeater { get; set; }
    public bool HasLight { get; set; }
    public string LightType { get; set; } = "none";
    public bool HasRO { get; set; }
    public bool HasDechlorinator { get; set; }
    public WaterParams Params { get; set; } = new();
    public double CopperPpm { get; set; }
    public double UneatenfFood { get; set; }
    public double Tannins { get; set; }
    public double PlantCoverScore { get; set; }
    public double BiofilmLevel { get; set; }
    public List<ShrimpState> Shrimp { get; set; } = [];
    public double GameAge { get; set; }
}

public class WaterParams
{
    public double Ph { get; set; } = 7.2;
    public double Gh { get; set; } = 7.0;
    public double Kh { get; set; } = 2.0;
    public double Tds { get; set; } = 150;
    public double TempF { get; set; } = 72;
    public double Ammonia { get; set; }
    public double Nitrite { get; set; }
    public double Nitrate { get; set; }
}

// ── Shrimp ────────────────────────────────────────────────────────────────────

public class ShrimpState
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string VariantId { get; set; } = string.Empty;
    public string Sex { get; set; } = "female";
    public string Stage { get; set; } = "adult";
    public double AgeGameDays { get; set; } = 60;
    public double Health { get; set; } = 1.0;
    public double Fullness { get; set; } = 0.9;
    public double DaysToMolt { get; set; } = 21;
    public double PostMoltWindow { get; set; }
    public double? BerriedDaysRemaining { get; set; }
    public int EggCount { get; set; }
    public double StressAccumulated { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public bool FacingRight { get; set; } = true;
    public string Behavior { get; set; } = "idle";
    public double BehaviorTimer { get; set; }
    public decimal? ListedPrice { get; set; }
}
