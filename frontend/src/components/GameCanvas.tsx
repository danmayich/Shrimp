import { useEffect, useRef, useState } from 'react';
import { createShrimpGame, destroyShrimpGame, GAME_EVENTS } from '../game/ShrimpGame';
import type { TankStateSnapshot } from '../game/ShrimpGame';
import type { TankTooltipData } from '../game/ShrimpGame';
import type { PlantMovedEvent } from '../game/ShrimpGame';
import type { BreedingEvent } from '../game/systems/BreedingSystem';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const knownShrimpIds = useRef<Set<string>>(new Set());
  const setTankSnapshot = useGameStore(s => s.setTankSnapshot);
  const setWaterWarnings = useGameStore(s => s.setWaterWarnings);
  const addBreedingNotification = useGameStore(s => s.addBreedingNotification);
  const updatePlantPositionInActiveTank = useGameStore(s => s.updatePlantPositionInActiveTank);
  const pushNotification = useUIStore(s => s.pushNotification);
  const [tooltip, setTooltip] = useState<TankTooltipData | null>(null);
  const profile = useGameStore(s => s.profile);
  const speed = profile?.gameSpeedMultiplier ?? 1;

  useEffect(() => {
    if (!containerRef.current) return;
    const game = createShrimpGame(containerRef.current);
    gameRef.current = game;

    // Subscribe to Phaser events
    game.events.on(GAME_EVENTS.TANK_STATE_UPDATE, (snap: TankStateSnapshot) => {
      setTankSnapshot(snap);
    });
    game.events.on(GAME_EVENTS.WATER_WARNINGS, (warnings: string[]) => {
      setWaterWarnings(warnings);
      warnings.filter(w => w.includes('🚨') || w.includes('☠️')).forEach(w => {
        pushNotification(w, 'danger');
      });
    });
    game.events.on(GAME_EVENTS.BREEDING_EVENT, (evt: BreedingEvent) => {
      if (evt.type === 'female_berried') {
        addBreedingNotification(`🥚 A female is berried! (${evt.eggCount} eggs)`);
        pushNotification(`🥚 Female shrimp is berried with ${evt.eggCount} eggs!`, 'success');
      }
      if (evt.type === 'hatch') {
        addBreedingNotification(`🦐 ${evt.count} shrimplets hatched!`);
        pushNotification(`🦐 ${evt.count} shrimplets hatched!`, 'success');
      }
      if (evt.type === 'male_swarm') {
        pushNotification('💕 Males are swimming frantically — breeding triggered!', 'info');
      }
      if (evt.type === 'shrimp_died') {
        pushNotification(`💀 A shrimp died: ${evt.cause}`, 'warning');
      }
    });
    game.events.on(GAME_EVENTS.TANK_TOOLTIP, (data: TankTooltipData | null) => {
      setTooltip(data);
    });
    game.events.on(GAME_EVENTS.PLANT_MOVED, ({ plantId, x, y }: PlantMovedEvent) => {
      updatePlantPositionInActiveTank(plantId, x, y);
    });

    return () => {
      setTooltip(null);
      destroyShrimpGame();
      gameRef.current = null;
    };
  }, [addBreedingNotification, pushNotification, setTankSnapshot, setWaterWarnings, updatePlantPositionInActiveTank]);

  // Send active tank to Phaser when it changes
  useEffect(() => {
    const game = gameRef.current;
    if (!game || !profile) return;
    const tank = profile.tanks.find(t => t.id === profile.activeTankId);
    if (tank) {
      game.events.emit(GAME_EVENTS.SET_TANK, tank);
      // Seed known IDs so the shrimp-watcher doesn't double-add them
      knownShrimpIds.current = new Set(tank.shrimp.map(s => s.id));
    }
  }, [profile?.activeTankId]);

  // Emit ADD_SHRIMP for any shrimp added after initial tank load
  useEffect(() => {
    const game = gameRef.current;
    if (!game || !profile) return;
    const tank = profile.tanks.find(t => t.id === profile.activeTankId);
    if (!tank) return;
    for (const s of tank.shrimp) {
      if (!knownShrimpIds.current.has(s.id)) {
        game.events.emit(GAME_EVENTS.ADD_SHRIMP, s);
        knownShrimpIds.current.add(s.id);
      }
    }
  }, [profile?.tanks]);

  // Send speed changes to Phaser
  useEffect(() => {
    gameRef.current?.events.emit(GAME_EVENTS.SET_SPEED, speed);
  }, [speed]);

  const leftPct = tooltip ? Math.max(2, Math.min(98, (tooltip.x / tooltip.tankW) * 100)) : 0;
  const topPct = tooltip ? Math.max(4, Math.min(96, (tooltip.y / tooltip.tankH) * 100)) : 0;
  const alignRight = leftPct > 70;
  const alignBottom = topPct < 24;

  return (
    <div className="tank-canvas-shell">
      <div ref={containerRef} className="tank-canvas-stage" />

      {tooltip && (
        <div
          className={`tank-tooltip-card ${tooltip.kind} ${tooltip.pinned ? 'pinned' : ''} ${alignRight ? 'align-right' : 'align-left'} ${alignBottom ? 'align-bottom' : 'align-top'}`}
          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
        >
          <div className="tank-tooltip-header-row">
            <div className="tank-tooltip-kind">{tooltip.kind === 'shrimp' ? 'Shrimp' : 'Plant'}</div>
            {tooltip.pinned && <div className="tank-tooltip-pin">Pinned</div>}
          </div>
          <div className="tank-tooltip-title">{tooltip.title}</div>
          {tooltip.subtitle && <div className="tank-tooltip-subtitle">{tooltip.subtitle}</div>}

          {tooltip.stats && tooltip.stats.length > 0 && (
            <div className="tank-tooltip-stats">
              {tooltip.stats.map((stat) => (
                <div key={`${stat.label}:${stat.value}`} className={`tank-tooltip-stat tone-${stat.tone ?? 'info'}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          )}

          {tooltip.detail && <div className="tank-tooltip-detail">{tooltip.detail}</div>}
          {tooltip.detail2 && <div className="tank-tooltip-detail">{tooltip.detail2}</div>}
        </div>
      )}
    </div>
  );
}
