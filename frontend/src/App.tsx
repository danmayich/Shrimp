import { useUIStore } from './store/uiStore';
import { useGameStore } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD/HUD';
import { ShopModal } from './components/Shop/ShopModal';
import { MarketModal } from './components/Marketplace/MarketModal';
import { LoginModal } from './components/Auth/LoginModal';
import { RegisterModal } from './components/Auth/RegisterModal';
import { TankPurchaseModal } from './components/TankSetup/TankPurchaseModal';
import { WaterChangeModal } from './components/WaterChange/WaterChangeModal';
import './index.css';
import { useEffect } from 'react';
import { playerApi } from './api/playerApi';

export default function App() {
  const openModal = useUIStore(s => s.openModal);
  const openModalId = useUIStore(s => s.openModalId);
  const closeModal = useUIStore(s => s.closeModal);
  const profile = useGameStore(s => s.profile);
  const setProfile = useGameStore(s => s.setProfile);
  const clearProfile = useGameStore(s => s.clearProfile);
  const authUser = useAuthStore(s => s.user);

  useEffect(() => {
    if (authUser?.token && !profile) {
      playerApi.getProfile()
        .then(r => setProfile(r.data))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.token]);

  useEffect(() => {
    if (!authUser) {
      clearProfile();
      if (openModal !== 'login' && openModal !== 'register') {
        closeModal();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  if (!authUser) {
    return (
      <div className="app-root">
        <div className="welcome-screen">
          <div className="welcome-box">
            <h1>🦐 ShrimpKeeper</h1>
            <p>Build your dream shrimp room, tune water chemistry, and breed premium lines.</p>
            <p className="welcome-cash">Sign in to continue your tanks and marketplace listings.</p>
            <div className="welcome-actions">
              <button className="buy-btn large" onClick={() => openModalId('login')}>
                Login
              </button>
              <button className="buy-btn large outline" onClick={() => openModalId('register')}>
                Create Account
              </button>
            </div>
          </div>
        </div>
        {openModal === 'login' && <LoginModal />}
        {openModal === 'register' && <RegisterModal />}
      </div>
    );
  }

  return (
    <div className="app-root">
      <GameCanvas />
      {profile && <HUD />}
      {openModal === 'shop' && <ShopModal />}
      {openModal === 'marketplace' && <MarketModal />}
      {openModal === 'tank_setup' && <TankPurchaseModal />}
      {openModal === 'water_change' && <WaterChangeModal />}
    </div>
  );
}

