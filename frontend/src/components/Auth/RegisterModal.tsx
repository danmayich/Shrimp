import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { authApi, toAuthUser } from '../../api/authApi';

export function RegisterModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const openModal = useUIStore(s => s.openModalId);
  const setUser = useAuthStore(s => s.setUser);
  const notify = useUIStore(s => s.pushNotification);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password || !confirm) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        username: username.trim(),
        email: email.trim() || `${username.trim()}@shrimp.local`,
        password,
      });
      const user = toAuthUser(res.data);
      setUser(user);
      notify(`Welcome, ${user.username}! You start with $1,000. Buy a tank!`, 'success');
      closeModal();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal auth-modal">
        <div className="modal-header">
          <h2>📝 Create Account</h2>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Username *
            <input
              type="text" autoComplete="username"
              value={username} onChange={e => setUsername(e.target.value)}
              disabled={loading} maxLength={32}
            />
          </label>
          <label>Email (optional)
            <input
              type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label>Password *
            <input
              type="password" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          <label>Confirm Password *
            <input
              type="password" autoComplete="new-password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              disabled={loading}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="buy-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
          <div className="auth-switch">
            Already have an account?{' '}
            <button type="button" className="link-btn" onClick={() => openModal('login')}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
