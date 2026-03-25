import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { getGame, GAME_EVENTS } from '../../game/ShrimpGame';

export function WaterChangeModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const notify = useUIStore(s => s.pushNotification);
  const tankSnapshot = useGameStore(s => s.tankSnapshot);

  const [pct, setPct] = useState(20);
  const [phVal, setPhVal] = useState(7.0);
  const [ghVal, setGhVal] = useState(6.0);
  const [khVal, setKhVal] = useState(1.0);
  const [tempVal, setTempVal] = useState(72);

  function handleWaterChange(e: React.FormEvent) {
    e.preventDefault();
    getGame()?.events.emit(GAME_EVENTS.WATER_CHANGE, {
      pct,
      freshParams: { ph: phVal, gh: ghVal, kh: khVal, tempF: tempVal },
    });
    notify(`${pct}% water change performed!`, 'success');
    closeModal();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal water-change-modal">
        <div className="modal-header">
          <h2>💧 Water Change</h2>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>
        <form className="water-change-form" onSubmit={handleWaterChange}>
          <label>Change Amount: <strong>{pct}%</strong>
            <input type="range" min={10} max={50} step={5} value={pct} onChange={e => setPct(+e.target.value)} />
          </label>

          <fieldset>
            <legend>Fresh Water Parameters</legend>
            <label>pH: <strong>{phVal.toFixed(1)}</strong>
              <input type="range" min={5.5} max={8.5} step={0.1} value={phVal} onChange={e => setPhVal(+e.target.value)} />
            </label>
            <label>GH: <strong>{ghVal.toFixed(1)}°</strong>
              <input type="range" min={0} max={20} step={0.5} value={ghVal} onChange={e => setGhVal(+e.target.value)} />
            </label>
            <label>KH: <strong>{khVal.toFixed(1)}°</strong>
              <input type="range" min={0} max={10} step={0.5} value={khVal} onChange={e => setKhVal(+e.target.value)} />
            </label>
            <label>Temp: <strong>{tempVal}°F</strong>
              <input type="range" min={60} max={82} step={1} value={tempVal} onChange={e => setTempVal(+e.target.value)} />
            </label>
          </fieldset>

          {tankSnapshot?.params && (
            <div className="current-params">
              <strong>Current tank:</strong> pH {tankSnapshot.params.ph.toFixed(1)} / GH {tankSnapshot.params.gh.toFixed(1)}°
              / KH {tankSnapshot.params.kh.toFixed(1)}° / {tankSnapshot.params.tempF.toFixed(1)}°F
            </div>
          )}

          <div className="confirm-actions">
            <button className="buy-btn" type="submit">Do Water Change</button>
            <button className="cancel-btn" type="button" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
