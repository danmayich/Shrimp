import { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { marketplaceApi } from '../../api/marketplaceApi';
import type { MarketListing } from '../../api/marketplaceApi';
import { SHRIMP_VARIANTS } from '../../game/data/shrimpVariants';

export function MarketModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const openModal = useUIStore(s => s.openModalId);
  const notify = useUIStore(s => s.pushNotification);
  const profile = useGameStore(s => s.profile);
  const addCash = useGameStore(s => s.addCash);
  const deductCash = useGameStore(s => s.deductCash);
  const addShrimpToActiveTank = useGameStore(s => s.addShrimpToActiveTank);
  const user = useAuthStore(s => s.user);

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'browse' | 'sell'>('browse');
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);
    try {
      const res = await marketplaceApi.getListings();
      setListings(res.data);
    } catch {
      notify('Could not load marketplace listings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(listing: MarketListing) {
    if (!user) { openModal('login'); return; }
    if (!profile || profile.cash < listing.price) {
      notify(`Need $${listing.price.toLocaleString()}`, 'warning');
      return;
    }
    try {
      await marketplaceApi.buyListing(listing.id);
      deductCash(listing.price);
      addShrimpToActiveTank(listing.shrimpVariantId ?? listing.itemId);
      notify(`Bought ${listing.itemName} for $${listing.price}!`, 'success');
      loadListings();
    } catch (e: any) {
      notify(e?.response?.data?.message ?? 'Purchase failed', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await marketplaceApi.cancelListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      notify('Listing removed', 'info');
    } catch {
      notify('Could not remove listing', 'error');
    }
  }

  const filtered = listings.filter(l =>
    filter === '' || l.itemName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal market-modal">
        <div className="modal-header">
          <h2>🏪 Marketplace</h2>
          {profile && <div className="modal-cash">💵 ${profile.cash.toLocaleString()}</div>}
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>

        <div className="modal-body">
          <div className="market-tabs">
            <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Browse</button>
            {user && <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>My Listings</button>}
          </div>

          {tab === 'browse' && (
            <>
              <div className="market-filter">
                <input
                  placeholder="Filter by variant..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
                {user && (
                  <button className="buy-btn small" onClick={() => setShowCreate(true)}>
                    + List Shrimp
                  </button>
                )}
              </div>

              {loading ? (
                <div className="market-loading">Loading listings…</div>
              ) : filtered.length === 0 ? (
                <div className="market-empty">No listings found. Be the first to sell!</div>
              ) : (
                <div className="market-listings">
                  {filtered.map(l => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      isOwn={l.sellerId === user?.id}
                      canAfford={!!(profile && profile.cash >= l.price)}
                      onBuy={() => handleBuy(l)}
                      onDelete={() => handleDelete(l.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'sell' && user && (
            <div className="my-listings">
              <button className="buy-btn" onClick={() => setShowCreate(true)}>+ New Listing</button>
              <div className="market-listings">
                {listings.filter(l => l.sellerId === user.id).map(l => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    isOwn
                    canAfford={false}
                    onBuy={() => {}}
                    onDelete={() => handleDelete(l.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateListingModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadListings(); }}
          onAddCash={addCash}
        />
      )}
    </div>
  );
}

function ListingCard({ listing, isOwn, canAfford, onBuy, onDelete }: {
  listing: MarketListing;
  isOwn: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="listing-card">
      <div className="listing-variant">{listing.itemName}</div>
      <div className="listing-details">
        <span>Sex: {listing.shrimpSex ?? 'unspecified'}</span>
        <span>Stage: {listing.shrimpStage ?? '—'}</span>
        <span>Age: {listing.shrimpAgeGameDays ?? 0}d</span>
      </div>
      {listing.notes && <div className="listing-notes">{listing.notes}</div>}
      <div className="listing-footer">
        <span className="listing-seller">by {listing.sellerName}</span>
        <span className="listing-price">${listing.price.toLocaleString()}</span>
        {isOwn ? (
          <button className="cancel-btn small" onClick={onDelete}>Remove</button>
        ) : (
          <button className="buy-btn small" disabled={!canAfford} onClick={onBuy}>
            {canAfford ? 'Buy' : 'Too expensive'}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateListingModal({ onClose, onCreated, onAddCash }: {
  onClose: () => void;
  onCreated: () => void;
  onAddCash: (amount: number) => void;
}) {
  const notify = useUIStore(s => s.pushNotification);
  const profile = useGameStore(s => s.profile);
  const deductCash = useGameStore(s => s.deductCash);

  const [variantId, setVariantId] = useState('');
  const [price, setPrice] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId) { notify('Select a shrimp variant', 'warning'); return; }
    if (price < 1) { notify('Price must be at least $1', 'warning'); return; }
    setLoading(true);
    try {
      const variant = SHRIMP_VARIANTS.find(v => v.id === variantId)!;
      await marketplaceApi.createListing({
        itemType: 'shrimp',
        itemId: variantId,
        itemName: variant.name,
        quantity: 1,
        price,
        notes: notes.trim() || '',
        shrimpVariantId: variantId,
      });
      onAddCash(price);
      notify(`Listed for $${price}!`, 'success');
      onCreated();
    } catch (e: any) {
      notify(e?.response?.data?.message ?? 'Failed to create listing', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog create-listing-dialog" onClick={e => e.stopPropagation()}>
        <h3>List a Shrimp for Sale</h3>
        <form onSubmit={handleSubmit}>
          <label>Variant
            <select value={variantId} onChange={e => setVariantId(e.target.value)}>
              <option value="">-- Select --</option>
              {SHRIMP_VARIANTS.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label>Price ($)
            <input type="number" min={1} max={9999} value={price} onChange={e => setPrice(+e.target.value)} />
          </label>
          <label>Notes (optional)
            <input type="text" maxLength={120} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="confirm-actions">
            <button className="buy-btn" type="submit" disabled={loading}>
              {loading ? 'Listing…' : 'List'}
            </button>
            <button className="cancel-btn" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
