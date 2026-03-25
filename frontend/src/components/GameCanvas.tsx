import { useEffect, useRef } from 'react';
import { createShrimpGame, destroyShrimpGame, GAME_EVENTS } from '../game/ShrimpGame';
import type { TankStateSnapshot } from '../game/ShrimpGame';
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
  const pushNotification = useUIStore(s => s.pushNotification);
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

    return () => {
      destroyShrimpGame();
      gameRef.current = null;
    };
  }, []);

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

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: 960,
        aspectRatio: '8/3.5',
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid rgba(74, 173, 255, 0.3)',
        boxShadow: '0 0 30px rgba(74, 173, 255, 0.15)',
        background: '#0d2a42',
      }}
    />
  );
}
