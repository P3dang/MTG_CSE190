import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav style={{
      height: 60,
      backgroundColor: '#0a0805',
      borderBottom: '1px solid #2d2820',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2.5rem',
      gap: '2.5rem',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: '1.5rem' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #c9a35a' }} />
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.22em', color: '#c9a35a' }}>
          SCRY FORGE
        </span>
      </div>

      <NavLink to="/" active={location.pathname === '/'}>Scanner</NavLink>
      <NavLink to="/collection" active={location.pathname === '/collection'}>My Collection</NavLink>

      {/* User info + sign out */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: '#5a4e38', fontSize: '0.78rem', fontStyle: 'italic' }}>
          {user?.email}
        </span>
        <button
          onClick={signOut}
          style={{
            background: 'transparent',
            border: '1px solid #3d3428',
            borderRadius: 4,
            color: '#5a4e38',
            fontFamily: 'Cinzel, serif',
            fontSize: '0.62rem',
            letterSpacing: '0.15em',
            padding: '0.3rem 0.75rem',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#c9a35a';
            e.currentTarget.style.borderColor = '#c9a35a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#5a4e38';
            e.currentTarget.style.borderColor = '#3d3428';
          }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '0.72rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        color: active ? '#c9a35a' : '#5a4e38',
        paddingBottom: '3px',
        borderBottom: `1px solid ${active ? '#c9a35a' : 'transparent'}`,
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </Link>
  );
}
