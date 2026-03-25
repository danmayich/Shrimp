import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SPEED_OPTIONS } from '../../game/data/gameConfig';
import type { SpeedMultiplier } from '../../game/data/gameConfig';
import { getGame, GAME_EVENTS } from '../../game/ShrimpGame';

function getCycleStageInfo(label?: string): {
  stageKey: 'cycled' | 'ammonia' | 'nitrite-spike' | 'nitrite-peak' | 'progress';
  hint: string;
} {
  const text = (label ?? '').toLowerCase();
  if (text.includes('cycled')) {
    return {
      stageKey: 'cycled',
      hint: 'Cycle complete: ammonia and nitrite are near zero while beneficial bacteria are established.',
    };
  }
  if (text.includes('phase 1') || text.includes('ammonia')) {
    return {
      stageKey: 'ammonia',
      hint: 'Phase 1: ammonia rises first as waste breaks down. Keep feeding light and monitor daily.',
    };
  }
  if (text.includes('phase 2') || text.includes('nitrite spike')) {
    return {
      stageKey: 'nitrite-spike',
      hint: 'Phase 2: ammonia starts dropping while nitrite climbs as bacteria convert ammonia.',
    };
  }
  if (text.includes('phase 3') || text.includes('nitrite peak')) {
    return {
      stageKey: 'nitrite-peak',
      hint: 'Phase 3: nitrite peaks, then declines as second-stage bacteria convert it to nitrate.',
    };
  }
  return {
    stageKey: 'progress',
    hint: 'Cycling in progress: bacteria are still establishing. Stability improves as this meter fills.',
  };
}

export function HUD() {
  const profile = useGameStore(s => s.profile);
  const clearProfile = useGameStore(s => s.clearProfile);
  const tankSnapshot = useGameStore(s => s.tankSnapshot);
  const waterWarnings = useGameStore(s => s.waterWarnings);
  const breedingNotifications = useGameStore(s => s.breedingNotifications);
  const clearBreeding = useGameStore(s => s.clearBreedingNotifications);
  const setSpeed = useGameStore(s => s.setSpeed);
  const openModal = useUIStore(s => s.openModalId);
  const notifications = useUIStore(s => s.notifications);
  const dismiss = useUIStore(s => s.dismissNotification);
  const closeModal = useUIStore(s => s.closeModal);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const speed = profile?.gameSpeedMultiplier ?? 1;

  function handleSpeedChange(s: SpeedMultiplier) {
    setSpeed(s);
    getGame()?.events.emit(GAME_EVENTS.SET_SPEED, s);
  }

  function handleFeed(type: string) {
    getGame()?.events.emit(GAME_EVENTS.ADD_FOOD, type);
  }

  function handleLogout() {
    closeModal();
    clearProfile();
    logout();
  }

  if (!profile) return null;

  const params = tankSnapshot?.params;
  const gameDay = tankSnapshot ? Math.floor(tankSnapshot.gameAge / 1440) : 0;
  const gameHour = tankSnapshot ? Math.floor((tankSnapshot.gameAge % 1440) / 60) : 0;
  const cycleProgressPct = tankSnapshot
    ? (tankSnapshot.cycled ? 100 : Math.max(0, Math.min(100, Math.round(tankSnapshot.bacteriaLevel * 100))))
    : 0;
  const cycleInfo = getCycleStageInfo(tankSnapshot?.cyclePhase.label);

  return (
    <div className="hud">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="hud-topbar">
        <div className="hud-cash">
          💵 <strong>${profile.cash.toLocaleString()}</strong>
        </div>

        <div className="hud-time">
          📅 Day {gameDay + 1}, {String(gameHour).padStart(2, '0')}:00
        </div>

        <div className="hud-speed">
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => handleSpeedChange(s as SpeedMultiplier)}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="hud-nav">
          <button onClick={() => openModal('shop')}>🛒 Shop</button>
          <button onClick={() => openModal('marketplace')}>🏪 Market</button>
          {user ? (
            <button onClick={handleLogout}>👋 Logout</button>
          ) : (
            <button onClick={() => openModal('login')}>🔑 Login</button>
          )}
        </div>
      </div>

      {/* ── Water params strip ──────────────────────────────────────── */}
      {params && (
        <div className="water-params-strip">
          <ParamBadge label="pH" value={params.ph.toFixed(1)} warn={params.ph < 6.5 || params.ph > 7.8} />
          <ParamBadge label="GH" value={`${params.gh.toFixed(1)}°`} warn={params.gh < 4} />
          <ParamBadge label="KH" value={`${params.kh.toFixed(1)}°`} warn={params.kh < 2} />
          <ParamBadge label="TDS" value={`${Math.round(params.tds)}ppm`} warn={params.tds > 300} />
          <ParamBadge label="Temp" value={`${params.tempF.toFixed(1)}°F`} warn={params.tempF > 78 || params.tempF < 64} />
          <ParamBadge label="NH₃" value={`${params.ammonia.toFixed(2)}`} warn={params.ammonia > 0.25} danger={params.ammonia > 0.5} />
          <ParamBadge label="NO₂" value={`${params.nitrite.toFixed(2)}`} warn={params.nitrite > 0.25} danger={params.nitrite > 0.5} />
          <ParamBadge label="NO₃" value={`${params.nitrate.toFixed(1)}`} warn={params.nitrate > 20} danger={params.nitrate > 40} />
          <div
            className={`cycle-meter cycle-stage-${cycleInfo.stageKey}`}
            aria-label={`Cycle progress ${cycleProgressPct}%`}
            title={cycleInfo.hint}
          >
            <div className="cycle-meter-top">
              <div className="cycle-badge" style={{ color: tankSnapshot?.cyclePhase.colorHex }}>
                {tankSnapshot?.cyclePhase.label}
              </div>
              <span className="cycle-help" title={cycleInfo.hint} aria-label="Cycle phase help">i</span>
              <div className="cycle-percent">{cycleProgressPct}%</div>
            </div>
            <div className="cycle-progress-track">
              <div
                className="cycle-progress-fill"
                style={{ width: `${cycleProgressPct}%`, backgroundColor: tankSnapshot?.cyclePhase.colorHex }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Actions bar ─────────────────────────────────────────────── */}
      <div className="hud-actions">
        <button className="action-btn" onClick={() => handleFeed('pellet')}>🟡 Feed Pellets</button>
        <button className="action-btn" onClick={() => handleFeed('veggie')}>🥒 Add Veggie</button>
        <button className="action-btn" onClick={() => handleFeed('biofilm')}>🦠 Dose Biofilm</button>
        <button className="action-btn" onClick={() => openModal('water_change')}>💧 Water Change</button>
      </div>

      {/* ── Shrimp roster ────────────────────────────────────────────── */}
      {tankSnapshot && (
        <div className="shrimp-count">
          🦐 {tankSnapshot.shrimpCount} shrimp
          {tankSnapshot.shrimp.filter(s => s.berriedDaysRemaining !== null).length > 0 && (
            <span className="berried-count">
              {' '}· 🥚 {tankSnapshot.shrimp.filter(s => s.berriedDaysRemaining !== null).length} berried
            </span>
          )}
        </div>
      )}

      {/* ── Water warnings ───────────────────────────────────────────── */}
      {waterWarnings.length > 0 && (
        <div className="water-warnings">
          {waterWarnings.map((w, i) => <div key={i} className="warning-tag">{w}</div>)}
        </div>
      )}

      {/* ── Breeding notifications ───────────────────────────────────── */}
      {breedingNotifications.length > 0 && (
        <div className="breeding-log">
          <div className="breeding-log-header">
            📋 Events
            <button onClick={clearBreeding}>✕</button>
          </div>
          {breedingNotifications.slice(0, 5).map((n, i) => (
            <div key={i} className="breeding-log-entry">{n}</div>
          ))}
        </div>
      )}

      {/* ── Toast notifications ──────────────────────────────────────── */}
      <div className="toasts">
        {notifications.map(n => (
          <div key={n.id} className={`toast toast-${n.type}`}>
            {n.text}
            <button onClick={() => dismiss(n.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParamBadge({
  label, value, warn = false, danger = false,
}: {
  label: string; value: string; warn?: boolean; danger?: boolean;
}) {
  return (
    <div className={`param-badge ${danger ? 'param-danger' : warn ? 'param-warn' : ''}`}>
      <span className="param-label">{label}</span>
      <span className="param-value">{value}</span>
    </div>
  );
}
