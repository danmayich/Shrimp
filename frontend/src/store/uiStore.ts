import { create } from 'zustand';

type ModalId = 'shop' | 'marketplace' | 'login' | 'register' | 'tank_setup' | 'water_change' | null;

interface Notification {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'error';
}

interface UIState {
  openModal: ModalId;
  shopCategory: string;
  sidebarOpen: boolean;
  notifications: Notification[];

  openModalId: (id: ModalId) => void;
  closeModal: () => void;
  setShopCategory: (cat: string) => void;
  toggleSidebar: () => void;
  pushNotification: (text: string, type?: Notification['type']) => void;
  dismissNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  openModal: null,
  shopCategory: 'tanks',
  sidebarOpen: false,
  notifications: [],

  openModalId: (id: ModalId) => set({ openModal: id }),
  closeModal:  () => set({ openModal: null }),
  setShopCategory: (cat: string) => set({ shopCategory: cat }),
  toggleSidebar: () => set((s: UIState) => ({ sidebarOpen: !s.sidebarOpen })),

  pushNotification: (text: string, type: Notification['type'] = 'info') =>
    set((s: UIState) => ({
      notifications: [
        ...s.notifications,
        { id: Math.random().toString(36).slice(2), text, type },
      ].slice(-6),
    })),

  dismissNotification: (id: string) =>
    set((s: UIState) => ({ notifications: s.notifications.filter((n: Notification) => n.id !== id) })),
}));

