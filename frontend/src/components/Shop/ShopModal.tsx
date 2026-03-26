import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { STORE_BY_CATEGORY, STORE_ITEMS } from '../../game/data/storeItems';
import { SHRIMP_VARIANTS } from '../../game/data/shrimpVariants';
import type { StoreItem } from '../../game/data/storeItems';
import { getGame, GAME_EVENTS } from '../../game/ShrimpGame';

const CATEGORIES = [
  { id: 'tanks', label: '🪣 Tanks' },
  { id: 'equipment', label: '⚙️ Equipment' },
  { id: 'food', label: '🍽️ Food' },
  { id: 'additives', label: '🧪 Additives' },
  { id: 'plants', label: '🌿 Plants' },
  { id: 'decor', label: '🪨 Decor' },
  { id: 'shrimp', label: '🦐 Shrimp' },
] as const;

export function ShopModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const profile = useGameStore(s => s.profile);
  const deductCash = useGameStore(s => s.deductCash);
  const purchaseTank = useGameStore(s => s.purchaseTank);
  const addShrimpToActiveTank = useGameStore(s => s.addShrimpToActiveTank);
  const addPlantToActiveTank = useGameStore(s => s.addPlantToActiveTank);
  const addInventoryItem = useGameStore(s => s.addInventoryItem);
  const notify = useUIStore(s => s.pushNotification);

  const [activeCategory, setActiveCategory] = useState<string>('tanks');
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [shrimpVariantId, setShrimpVariantId] = useState<string>('');
  const [shrimpQty, setShrimpQty] = useState(5);

  if (!profile) return null;

  const items: StoreItem[] = activeCategory === 'shrimp' ? [] : (STORE_BY_CATEGORY[activeCategory as import('../../game/data/storeItems').StoreCategory] ?? []);

  function canBuy(price: number) {
    return (profile?.cash ?? 0) >= price;
  }

  async function handleBuy(item: StoreItem) {
    if (!canBuy(item.price)) {
      notify(`Not enough cash! Need $${item.price.toLocaleString()}`, 'warning');
      return;
    }
    if (item.category === 'tanks') {
      const gallons = (item.meta?.gallons as number) ?? 10;
      purchaseTank(gallons, item.id, item.price);
      notify(`Purchased ${item.name}!`, 'success');
      closeModal();
      return;
    }

    if (item.category === 'plants') {
      if (!profile.activeTankId) {
        notify('Set up a tank first before adding plants.', 'warning');
        return;
      }
      const cover = Number(item.meta?.coverScore ?? 4);
      if (deductCash(item.price)) {
        addInventoryItem(item.id);
        const updatedTank = addPlantToActiveTank(item.id, cover);
        if (updatedTank) {
          getGame()?.events.emit(GAME_EVENTS.SET_TANK, updatedTank);
        }
        notify(`Added ${item.name}. Plant cover increased (+${cover}).`, 'success');
        closeModal();
      }
      setConfirmItem(null);
      return;
    }

    if (deductCash(item.price)) {
      addInventoryItem(item.id);
      notify(`Purchased ${item.name}`, 'success');
      closeModal();
    }
    setConfirmItem(null);
  }

  function handleBuyShrimp() {
    if (!shrimpVariantId) return;
    const variant = SHRIMP_VARIANTS.find(v => v.id === shrimpVariantId);
    if (!variant) return;
    const total = variant.npcPrice * shrimpQty;
    if (!canBuy(total)) {
      notify(`Need $${total.toLocaleString()} for ${shrimpQty}× ${variant.name}`, 'warning');
      return;
    }
    if (!profile!.activeTankId) {
      notify('Set up a tank first!', 'warning');
      return;
    }
    if (deductCash(total)) {
      for (let i = 0; i < shrimpQty; i++) addShrimpToActiveTank(shrimpVariantId);
      notify(`Added ${shrimpQty}× ${variant.name} to your tank`, 'success');
      closeModal();
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal shop-modal">
        <div className="modal-header">
          <h2>🛒 NPC Shop</h2>
          <div className="modal-cash">💵 ${profile.cash.toLocaleString()}</div>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>

        <div className="modal-body">
          {/* category tabs */}
          <div className="shop-tabs">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`shop-tab ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* shrimp panel */}
          {activeCategory === 'shrimp' && (
            <div className="shrimp-buy-panel">
              <div className="shrimp-variant-grid">
                {SHRIMP_VARIANTS.map(v => (
                  <div
                    key={v.id}
                    className={`shrimp-variant-card ${shrimpVariantId === v.id ? 'selected' : ''}`}
                    onClick={() => setShrimpVariantId(v.id)}
                  >
                    <div className="sv-name">{v.name}</div>
                    <div className="sv-species">{v.group === 'neocaridina' ? '🟥 Neo' : '🔵 Cari'}</div>
                    <div className="sv-price">${v.npcPrice}/ea</div>
                    <div className="sv-care">Care: {v.difficulty}</div>
                  </div>
                ))}
              </div>
              {shrimpVariantId && (
                <div className="shrimp-buy-controls">
                  <label>Quantity:</label>
                  <input
                    type="number" min={1} max={50}
                    value={shrimpQty}
                    onChange={e => setShrimpQty(Math.max(1, Math.min(50, +e.target.value)))}
                  />
                  {(() => {
                    const v = SHRIMP_VARIANTS.find(x => x.id === shrimpVariantId)!;
                    const total = v.npcPrice * shrimpQty;
                    return (
                      <button
                        className="buy-btn"
                        disabled={!canBuy(total)}
                        onClick={handleBuyShrimp}
                      >
                        Buy {shrimpQty}× ${total.toLocaleString()}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* other item panels */}
          {activeCategory !== 'shrimp' && (
            <div className="shop-items-grid">
              {items.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  affordable={canBuy(item.price)}
                  onBuy={() => setConfirmItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmItem && (
        <div className="confirm-overlay" onClick={() => setConfirmItem(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Purchase {confirmItem.name}?</h3>
            <p>{confirmItem.description}</p>
            <p className="confirm-price">Cost: <strong>${confirmItem.price.toLocaleString()}</strong></p>
            <div className="confirm-actions">
              <button className="buy-btn" onClick={() => handleBuy(confirmItem)}>Buy</button>
              <button className="cancel-btn" onClick={() => setConfirmItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopItemCard({ item, affordable, onBuy }: {
  item: StoreItem; affordable: boolean; onBuy: () => void;
}) {
  return (
    <div className={`shop-item-card ${!affordable ? 'unaffordable' : ''}`}>
      <div className="shop-item-icon">{item.icon ?? '📦'}</div>
      <div className="shop-item-name">{item.name}</div>
      <div className="shop-item-desc">{item.description}</div>
      <div className="shop-item-price">${item.price.toLocaleString()}</div>
      <button className="buy-btn" disabled={!affordable} onClick={onBuy}>
        {affordable ? 'Buy' : 'Too expensive'}
      </button>
    </div>
  );
}
