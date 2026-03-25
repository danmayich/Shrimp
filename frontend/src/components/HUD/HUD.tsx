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

function getBacteriaTier(pct: number): {
  label: string;
  className: 'low' | 'mid' | 'high' | 'max';
  hint: string;
} {
  if (pct >= 90) {
    return {
      label: 'Mature colony',
      className: 'max',
      hint: 'Mature biofilter: ammonia and nitrite are processed quickly when load increases.',
    };
  }
  if (pct >= 65) {
    return {
      label: 'Established colony',
      className: 'high',
      hint: 'Established bacteria colony: cycle is stable but can still dip under heavy feeding spikes.',
    };
  }
  if (pct >= 35) {
    return {
      label: 'Growing colony',
      className: 'mid',
      hint: 'Bacteria population is growing: conversion is improving but not yet robust.',
    };
  }
  return {
    label: 'Seed stage',
    className: 'low',
    hint: 'Early colony stage: limited ammonia/nitrite conversion, high risk of spikes.',
  };
}

function getCycleProgressPct(snapshot: NonNullable<ReturnType<typeof useGameStore.getState>['tankSnapshot']>): number {
  if (snapshot.cycled) return 100;

  // Cycle completion is influenced by colony size, but unresolved ammonia/nitrite
  // should keep this meter below 100 until the tank is truly cycled.
  const colonyScore = Math.max(0, Math.min(1, snapshot.bacteriaLevel));
  const ammoniaPenalty = Math.min(0.35, snapshot.params.ammonia / 2);
  const nitritePenalty = Math.min(0.35, snapshot.params.nitrite / 2);
  const nitrateBonus = snapshot.params.nitrate > 0 ? 0.05 : 0;

  const weighted = colonyScore * 0.9 + nitrateBonus - (ammoniaPenalty + nitritePenalty);
  const pct = Math.round(Math.max(0.05, Math.min(0.95, weighted)) * 100);
  return Math.min(95, pct);
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
  const cycleProgressPct = tankSnapshot ? getCycleProgressPct(tankSnapshot) : 0;
  const cycleInfo = getCycleStageInfo(tankSnapshot?.cyclePhase.label);
  const bacteriaPct = tankSnapshot ? Math.max(0, Math.min(100, Math.round(tankSnapshot.bacteriaLevel * 100))) : 0;
  const bacteriaTier = getBacteriaTier(bacteriaPct);

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
        <>
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
        <div className="bacteria-meter" title={bacteriaTier.hint} aria-label={`Beneficial bacteria ${bacteriaPct}%`}>
          <div className="bacteria-meter-top">
            <div className="bacteria-title">Beneficial Bacteria</div>
            <div className="bacteria-percent">{bacteriaPct}%</div>
          </div>
          <div className="bacteria-progress-track">
            <div className={`bacteria-progress-fill bacteria-${bacteriaTier.className}`} style={{ width: `${bacteriaPct}%` }} />
          </div>
          <div className={`bacteria-tier bacteria-tier-${bacteriaTier.className}`}>{bacteriaTier.label}</div>
        </div>
        </>
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
