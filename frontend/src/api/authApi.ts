import { api } from './apiClient';
import type { AuthUser } from '../store/authStore';

export interface RegisterRequest { username: string; email: string; password: string; }
export interface LoginRequest { username: string; password: string; }
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email?: string | null;
  };
}

export function toAuthUser(res: AuthResponse): AuthUser {
  return {
    id: res.user.id,
    username: res.user.username,
    email: res.user.email ?? '',
    token: res.token,
  };
}

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data),
};
