using System.Text.Json;
using System.Text.Json.Serialization;

namespace ShrimpGame.API.Services;

/// <summary>
/// Thread-safe JSON file storage. One file per "key" (e.g. player ID).
/// </summary>
public class JsonStorageService
{
    private readonly string _baseDir;
    private static readonly JsonSerializerOptions _opts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
    // Per-file locks to prevent concurrent writes
    private static readonly Dictionary<string, SemaphoreSlim> _locks = new();
    private static readonly object _lockDictLock = new();

    public JsonStorageService(string baseDir)
    {
        _baseDir = baseDir;
        Directory.CreateDirectory(baseDir);
    }

    private SemaphoreSlim GetLock(string path)
    {
        lock (_lockDictLock)
        {
            if (!_locks.TryGetValue(path, out var sem))
            {
                sem = new SemaphoreSlim(1, 1);
                _locks[path] = sem;
            }
            return sem;
        }
    }

    public async Task<T?> ReadAsync<T>(string key) where T : class
    {
        var path = Path.Combine(_baseDir, SanitizeKey(key) + ".json");
        if (!File.Exists(path)) return null;
        var sem = GetLock(path);
        await sem.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(path);
            return JsonSerializer.Deserialize<T>(json, _opts);
        }
        finally { sem.Release(); }
    }

    public async Task WriteAsync<T>(string key, T value)
    {
        var path = Path.Combine(_baseDir, SanitizeKey(key) + ".json");
        var sem = GetLock(path);
        await sem.WaitAsync();
        try
        {
            var json = JsonSerializer.Serialize(value, _opts);
            await File.WriteAllTextAsync(path, json);
        }
        finally { sem.Release(); }
    }

    public async Task<List<T>> ReadAllAsync<T>() where T : class
    {
        var results = new List<T>();
        foreach (var file in Directory.GetFiles(_baseDir, "*.json"))
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var obj = JsonSerializer.Deserialize<T>(json, _opts);
                if (obj is not null) results.Add(obj);
            }
            catch { /* skip corrupt files */ }
        }
        return results;
    }

    public async Task DeleteAsync(string key)
    {
        var path = Path.Combine(_baseDir, SanitizeKey(key) + ".json");
        var sem = GetLock(path);
        await sem.WaitAsync();
        try { if (File.Exists(path)) File.Delete(path); }
        finally { sem.Release(); }
    }

    private static string SanitizeKey(string key)
    {
        // Only allow alphanumeric, dash, underscore to prevent path traversal
        return new string(key.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray());
    }
}
