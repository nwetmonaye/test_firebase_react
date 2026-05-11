import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function navClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link';
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="top-nav">
      <div className="brand">Product Board</div>
      <nav className="nav-links">
        {user ? <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink> : null}
        {!user ? <NavLink to="/login" className={navClass}>Login</NavLink> : null}
        {!user ? <NavLink to="/register" className={navClass}>Register</NavLink> : null}
      </nav>
      <div className="nav-user">
        {user ? <span className="user-email">{user.email}</span> : null}
        {user ? (
          <button type="button" className="sign-out" onClick={() => void logout()}>
            Sign out
          </button>
        ) : null}
      </div>
    </header>
  );
}
