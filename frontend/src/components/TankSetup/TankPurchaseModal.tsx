import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { STORE_ITEMS } from '../../game/data/storeItems';
import { getGame, GAME_EVENTS } from '../../game/ShrimpGame';

const TANK_ITEMS = STORE_ITEMS.filter(i => i.category === 'tanks');

export function TankPurchaseModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const notify = useUIStore(s => s.pushNotification);
  const profile = useGameStore(s => s.profile);
  const deductCash = useGameStore(s => s.deductCash);
  const purchaseTank = useGameStore(s => s.purchaseTank);
  const activeTankId = useGameStore(s => s.profile?.activeTankId);
  const setActiveTank = useGameStore(s => s.setActiveTank);

  const [selected, setSelected] = useState('');
  const [tankName, setTankName] = useState('My Aquarium');

  if (!profile) return null;

  function handlePurchase() {
    const item = TANK_ITEMS.find(i => i.id === selected);
    if (!item) { notify('Select a tank first', 'warning'); return; }
    if (profile!.cash < item.price) {
      notify(`Need $${item.price.toLocaleString()}`, 'warning');
      return;
    }
    const gallons = (item.meta?.gallons as number) ?? 10;
    const newTank = purchaseTank(gallons, item.id, item.price);
    if (newTank) {
      setActiveTank(newTank.id);
      getGame()?.events.emit(GAME_EVENTS.SET_TANK, newTank);
      notify(`${tankName} is ready!`, 'success');
    }
    closeModal();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal tank-purchase-modal">
        <div className="modal-header">
          <h2>🪣 Set Up Your Aquarium</h2>
          <div className="modal-cash">💵 ${profile.cash.toLocaleString()}</div>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>

        <div className="modal-body">
          <div className="tank-options-grid">
            {TANK_ITEMS.map(item => (
              <div
                key={item.id}
                className={`tank-option-card ${selected === item.id ? 'selected' : ''} ${profile.cash < item.price ? 'unaffordable' : ''}`}
                onClick={() => profile.cash >= item.price && setSelected(item.id)}
              >
                <div className="to-name">{item.name}</div>
                <div className="to-desc">{item.description}</div>
                <div className="to-price">${item.price.toLocaleString()}</div>
                {item.meta?.gallons != null && <div className="to-size">{String(item.meta.gallons as number)} gallons</div>}
              </div>
            ))}
          </div>

          {selected && (
            <div className="tank-name-row">
              <label>Tank name:
                <input
                  type="text" maxLength={40}
                  value={tankName}
                  onChange={e => setTankName(e.target.value)}
                />
              </label>
              <button
                className="buy-btn"
                onClick={handlePurchase}
                disabled={!selected}
              >
                Purchase &amp; Set Up
              </button>
            </div>
          )}

          {!selected && (
            <p className="tank-hint">Select a tank above to get started. You have $1,000 — start with a 5-gallon!</p>
          )}
        </div>
      </div>
    </div>
  );
}
