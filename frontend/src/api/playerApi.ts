import { api } from './apiClient';
import type { PlayerProfile } from '../store/gameStore';

export const playerApi = {
  getProfile: () => api.get<PlayerProfile>('/player/profile'),
  saveProfile: (profile: PlayerProfile) => api.put('/player/profile', profile),
  purchase: (itemId: string, quantity: number) =>
    api.post<{ newBalance: number }>('/player/purchase', { itemId, quantity }),
};
