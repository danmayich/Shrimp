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

type MeterStatus = 'ok' | 'warn' | 'danger';

interface MeterConfig {
  key: string;
  label: string;
  fullName: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  warnMin: number;
  idealMin: number;
  idealMax: number;
  warnMax: number;
  decimals?: number;
  suffix?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getMeterStatus(value: number, cfg: MeterConfig): MeterStatus {
  if (value < cfg.warnMin || value > cfg.warnMax) return 'danger';
  if (value < cfg.idealMin || value > cfg.idealMax) return 'warn';
  return 'ok';
}

function getRangeGradient(cfg: MeterConfig): string {
  const toTop = (v: number) => 100 - ((clamp(v, cfg.min, cfg.max) - cfg.min) / (cfg.max - cfg.min)) * 100;
  const pWarnMax = toTop(cfg.warnMax);
  const pIdealMax = toTop(cfg.idealMax);
  const pIdealMin = toTop(cfg.idealMin);
  const pWarnMin = toTop(cfg.warnMin);

  return `linear-gradient(to top,
    rgba(255,107,107,0.35) 0%,
    rgba(255,107,107,0.35) ${100 - pWarnMin}%,
    rgba(255,212,59,0.35) ${100 - pWarnMin}%,
    rgba(255,212,59,0.35) ${100 - pIdealMin}%,
    rgba(81,207,102,0.35) ${100 - pIdealMin}%,
    rgba(81,207,102,0.35) ${100 - pIdealMax}%,
    rgba(255,212,59,0.35) ${100 - pIdealMax}%,
    rgba(255,212,59,0.35) ${100 - pWarnMax}%,
    rgba(255,107,107,0.35) ${100 - pWarnMax}%,
    rgba(255,107,107,0.35) 100%)`;
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
  const paramMeters: MeterConfig[] = params ? [
    {
      key: 'ph',
      label: 'pH',
      fullName: 'Acidity / Alkalinity',
      tooltip: 'pH measures how acidic or alkaline the water is. Stable pH keeps shrimp healthy and lowers stress.',
      value: params.ph,
      min: 5.5,
      max: 8.5,
      warnMin: 6.2,
      idealMin: 6.5,
      idealMax: 7.8,
      warnMax: 8.1,
      decimals: 1,
    },
    {
      key: 'gh',
      label: 'GH',
      fullName: 'General Hardness',
      tooltip: 'GH is dissolved calcium and magnesium. Shrimp need enough GH for healthy molts and shell development.',
      value: params.gh,
      min: 0,
      max: 14,
      warnMin: 2,
      idealMin: 4,
      idealMax: 10,
      warnMax: 12,
      decimals: 1,
      suffix: '°',
    },
    {
      key: 'kh',
      label: 'KH',
      fullName: 'Carbonate Hardness',
      tooltip: 'KH is buffering capacity. It helps prevent sudden pH swings that can shock shrimp.',
      value: params.kh,
      min: 0,
      max: 8,
      warnMin: 1,
      idealMin: 2,
      idealMax: 6,
      warnMax: 7,
      decimals: 1,
      suffix: '°',
    },
    {
      key: 'tds',
      label: 'TDS',
      fullName: 'Total Dissolved Solids',
      tooltip: 'TDS is the total concentration of dissolved minerals and organics in the water.',
      value: params.tds,
      min: 50,
      max: 400,
      warnMin: 100,
      idealMin: 140,
      idealMax: 260,
      warnMax: 320,
      decimals: 0,
      suffix: 'ppm',
    },
    {
      key: 'temp',
      label: 'Temp',
      fullName: 'Temperature',
      tooltip: 'Water temperature affects metabolism, oxygen demand, breeding behavior, and stress.',
      value: params.tempF,
      min: 60,
      max: 82,
      warnMin: 64,
      idealMin: 68,
      idealMax: 78,
      warnMax: 80,
      decimals: 1,
      suffix: 'F',
    },
    {
      key: 'nh3',
      label: 'NH₃',
      fullName: 'Ammonia',
      tooltip: 'NH₃ is ammonia, highly toxic to shrimp. It should stay as close to zero as possible.',
      value: params.ammonia,
      min: 0,
      max: 1.2,
      warnMin: 0,
      idealMin: 0,
      idealMax: 0.15,
      warnMax: 0.35,
      decimals: 2,
    },
    {
      key: 'no2',
      label: 'NO₂',
      fullName: 'Nitrite',
      tooltip: 'NO₂ is nitrite, a toxic intermediate in the nitrogen cycle. It should be near zero.',
      value: params.nitrite,
      min: 0,
      max: 1.2,
      warnMin: 0,
      idealMin: 0,
      idealMax: 0.15,
      warnMax: 0.35,
      decimals: 2,
    },
    {
      key: 'no3',
      label: 'NO₃',
      fullName: 'Nitrate',
      tooltip: 'NO₃ is nitrate, the end product of cycling. Less toxic, but high levels still stress shrimp over time.',
      value: params.nitrate,
      min: 0,
      max: 60,
      warnMin: 0,
      idealMin: 0,
      idealMax: 20,
      warnMax: 35,
      decimals: 1,
    },
  ] : [];

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
          <div className="param-meter-grid">
            {paramMeters.map((cfg) => {
              const pct = ((clamp(cfg.value, cfg.min, cfg.max) - cfg.min) / (cfg.max - cfg.min)) * 100;
              const status = getMeterStatus(cfg.value, cfg);
              return (
                <div key={cfg.key} className="param-meter" title={`${cfg.fullName}: ${cfg.value.toFixed(cfg.decimals ?? 1)}${cfg.suffix ?? ''}`}>
                  <div className="param-meter-label-row">
                    <div className="param-meter-label" title={cfg.tooltip}>{cfg.label}</div>
                    <span className="param-meter-help" title={cfg.tooltip} aria-label={`${cfg.fullName} info`}>i</span>
                  </div>
                  <div className="param-meter-track" style={{ backgroundImage: getRangeGradient(cfg) }}>
                    <div className={`param-meter-fill meter-${status}`} style={{ height: `${pct}%` }} />
                    <div className={`param-meter-indicator meter-${status}`} style={{ bottom: `${pct}%` }} />
                  </div>
                  <div className="param-meter-value">{cfg.value.toFixed(cfg.decimals ?? 1)}{cfg.suffix ?? ''}</div>
                </div>
              );
            })}
          </div>
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
