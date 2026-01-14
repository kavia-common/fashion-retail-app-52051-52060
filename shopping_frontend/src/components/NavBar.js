import React, { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { getFeatureFlags } from '../config/env';

import Button from './Button';
import styles from './NavBar.module.css';

// PUBLIC_INTERFACE
export default function NavBar() {
  /** Top navigation bar with global search + cart/auth links. */
  const { itemCount } = useCart();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const flags = useMemo(() => getFeatureFlags(), []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [q, setQ] = useState(() => searchParams.get('q') || '');

  const onSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    navigate(`/?${params.toString()}`);
  };

  return (
    <header className={styles.header}>
      <div className={['container', styles.inner].join(' ')}>
        <div className={styles.left}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden />
            <span className={styles.brandText}>Fashion Retail</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            <NavLink className={({ isActive }) => (isActive ? styles.activeLink : styles.link)} to="/">
              Shop
            </NavLink>
            <NavLink
              className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
              to="/cart"
            >
              Cart <span className={styles.cartPill}>{itemCount}</span>
            </NavLink>
            {isAdmin ? (
              <NavLink
                className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                to="/admin"
              >
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className={styles.right}>
          <form className={styles.search} onSubmit={onSearch}>
            <label className="srOnly" htmlFor="navSearch">
              Search products
            </label>
            <input
              id="navSearch"
              className={styles.searchInput}
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className={styles.searchBtn} type="submit" aria-label="Search">
              Search
            </button>
          </form>

          <div className={styles.auth}>
            <span className={styles.user}>
              {isAuthenticated ? (
                <>
                  <span className={styles.userDot} aria-hidden />
                  <span className={styles.userText}>{user?.name || user?.email}</span>
                </>
              ) : (
                <span className={styles.userText}>Guest</span>
              )}
            </span>

            {isAuthenticated ? (
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>

          {flags.MOCK_API ? <span className="badge">MOCK_API</span> : null}
        </div>
      </div>
    </header>
  );
}
