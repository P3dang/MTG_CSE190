import { useState } from 'react';
import { supabase } from '../lib/supabase';

const GOLD = '#c9a35a';
const GOLD_DIM = '#5a4e38';
const SURFACE = '#141210';
const BORDER = '#2d2820';
const TEXT = '#e8d5a8';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created! You can now sign in.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // AuthContext picks up the new session and App redirects automatically
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setMessage(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0d0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        backgroundColor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: '2.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${GOLD}` }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.22em', color: GOLD }}>
              SCRY FORGE
            </span>
          </div>
          <p style={{ color: GOLD_DIM, fontSize: '0.8rem', fontStyle: 'italic' }}>
            {mode === 'login' ? 'Sign in to your collection' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              color: GOLD,
              marginBottom: '0.4rem',
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                backgroundColor: '#0f0d0a',
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                color: TEXT,
                fontSize: '0.9rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e) => (e.target.style.borderColor = BORDER)}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              color: GOLD,
              marginBottom: '0.4rem',
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                backgroundColor: '#0f0d0a',
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                color: TEXT,
                fontSize: '0.9rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e) => (e.target.style.borderColor = BORDER)}
            />
          </div>

          {error && (
            <div style={{
              color: '#e57373',
              backgroundColor: '#1a0d0d',
              border: '1px solid #5a2020',
              borderRadius: 4,
              padding: '0.6rem 0.75rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              color: '#4ade80',
              backgroundColor: '#0d1a0d',
              border: '1px solid #2a5a2a',
              borderRadius: 4,
              padding: '0.6rem 0.75rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.7rem',
              background: 'transparent',
              border: `1px solid ${loading ? GOLD_DIM : GOLD}`,
              borderRadius: 6,
              color: loading ? GOLD_DIM : GOLD,
              fontFamily: 'Cinzel, serif',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'PLEASE WAIT...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: GOLD_DIM }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: GOLD,
              cursor: 'pointer',
              fontSize: '0.8rem',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
