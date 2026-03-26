import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services';
import { LogIn } from 'lucide-react';

export default function Login() {
  const login = useAuthStore(state => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, token } = await authService.login({ username, password });
      login(user, token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          Welcome Back
        </h2>

        {error && (
          <div className="badge badge-danger" style={{ marginBottom: '1rem', width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <label>Username</label>
            <input 
              className="input-field" 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              required 
            />
          </div>

          <div className="input-container">
            <label>Password</label>
            <input 
              className="input-field" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem' }}
            disabled={loading}
          >
            <LogIn size={18} /> {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Try 'admin/admin123' or 'worker1/field123'
        </div>
      </div>
    </div>
  );
}
