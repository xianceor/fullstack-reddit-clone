import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import './Navbar.css';

const Logo = () => (
  <Link to="/" className="navbar-logo" aria-label="Readit home">
    <svg width="32" height="32" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FF4500"/>
      <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.61-1.08zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.85.79 3.58 3.58 0 01-2.85-.79.27.27 0 01.38-.38 3.07 3.07 0 002.47.61 3.07 3.07 0 002.47-.61.27.27 0 01.38.38zm-.22-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="white"/>
    </svg>
    <span className="navbar-wordmark">readit</span>
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount, markAllRead } = useNotifications() || {};
  const navigate = useNavigate();
  const [search, setSearch]     = useState('');
  const [userMenu, setUserMenu] = useState(false);
  const [notifMenu, setNotifMenu] = useState(false);
  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearch('');
  }, [search, navigate]);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <Logo />

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch} role="search">
          <svg className="navbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Readit"
            aria-label="Search posts and communities"
          />
        </form>

        <div className="navbar-right">
          {user ? (
            <>
              {/* Notifications bell */}
              <div className="navbar-notif-wrap" ref={notifRef}>
                <button
                  className="navbar-icon-btn"
                  onClick={() => { setNotifMenu(m => !m); markAllRead?.(); }}
                  aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="navbar-badge" aria-label={`${unreadCount} unread notifications`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifMenu && (
                  <div className="navbar-dropdown notif-dropdown" role="menu">
                    <div className="dropdown-header">Notifications</div>
                    <p className="notif-empty">You're all caught up!</p>
                  </div>
                )}
              </div>

              {/* Create post shortcut */}
              <Link to="/submit" className="navbar-create-btn btn btn-secondary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create
              </Link>

              {/* User menu */}
              <div className="navbar-user" ref={menuRef}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setUserMenu(m => !m)}
                  aria-expanded={userMenu}
                  aria-haspopup="menu"
                >
                  <div className="navbar-avatar" aria-hidden="true">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="navbar-username">{user.username}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                {userMenu && (
                  <div className="navbar-dropdown" role="menu">
                    <Link to={`/user/${user.username}`} className="dropdown-item" role="menuitem" onClick={() => setUserMenu(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                      Profile
                    </Link>
                    <Link to="/submit" className="dropdown-item" role="menuitem" onClick={() => setUserMenu(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Create Post
                    </Link>
                    <Link to="/r/create" className="dropdown-item" role="menuitem" onClick={() => setUserMenu(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      Create Community
                    </Link>
                    <div className="dropdown-divider" role="separator"/>
                    <button className="dropdown-item dropdown-item--danger" role="menuitem" onClick={() => { logout(); setUserMenu(false); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="navbar-auth-btns">
              <Link to="/login"    className="btn btn-secondary btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary   btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
