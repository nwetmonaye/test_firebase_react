import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err.code) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card auth-card">
      <h1>Register</h1>
      <form className="form auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busy || !email.trim() || password.length < 6}>
          {busy ? 'Please wait...' : 'Create account'}
        </button>
      </form>
      {error ? <p className="banner error">{error}</p> : null}
      <p className="muted">
        Already have account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}
