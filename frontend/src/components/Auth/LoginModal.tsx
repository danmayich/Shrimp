import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { authApi, toAuthUser } from '../../api/authApi';

export function LoginModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const openModal = useUIStore(s => s.openModalId);
  const setUser = useAuthStore(s => s.setUser);
  const notify = useUIStore(s => s.pushNotification);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ username: username.trim(), password });
      const user = toAuthUser(res.data);
      setUser(user);
      notify(`Welcome back, ${user.username}!`, 'success');
      closeModal();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal auth-modal">
        <div className="modal-header">
          <h2>🔑 Login</h2>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Username
            <input
              type="text" autoComplete="username"
              value={username} onChange={e => setUsername(e.target.value)}
              disabled={loading} maxLength={32}
            />
          </label>
          <label>Password
            <input
              type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="buy-btn" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
          <div className="auth-switch">
            No account?{' '}
            <button type="button" className="link-btn" onClick={() => openModal('register')}>
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
