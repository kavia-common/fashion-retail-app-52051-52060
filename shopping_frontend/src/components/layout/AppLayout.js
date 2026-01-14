import React, { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

/**
 * Small helper to keep NavLink styling consistent.
 */
function AppNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `navlink ${isActive ? 'navlink--active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

// PUBLIC_INTERFACE
function AppLayout({ children, theme, onToggleTheme, searchValue, onSearchSubmit, cartCount }) {
  /** Global app shell with top navigation and a responsive main content wrapper. */
  const searchInputId = useId();
  const [localSearch, setLocalSearch] = useState(searchValue || '');
  const location = useLocation();

  // Keep input synced when navigation changes the URL query string.
  useEffect(() => setLocalSearch(searchValue || ''), [searchValue, location.key]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit(localSearch);
  };

  return (
    <div className="AppShell">
      <header className="TopNav" role="banner">
        <div className="TopNav__inner">
          <div className="TopNav__left">
            <Link to="/catalog" className="Brand" aria-label="Go to catalog">
              <span className="Brand__mark" aria-hidden="true">
                FR
              </span>
              <span className="Brand__text">Fashion Retail</span>
            </Link>
          </div>

          <div className="TopNav__center">
            <form className="Search" onSubmit={handleSubmit} role="search" aria-label="Search products">
              <label className="srOnly" htmlFor={searchInputId}>
                Search products
              </label>
              <input
                id={searchInputId}
                className="Search__input"
                type="search"
                inputMode="search"
                placeholder="Search products…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <button className="btn btnPrimary Search__button" type="submit">
                Search
              </button>
            </form>
          </div>

          <nav className="TopNav__right" aria-label="Primary navigation">
            <AppNavLink to="/catalog">Catalog</AppNavLink>
            <AppNavLink to="/cart">
              Cart <span className="Badge" aria-label={`Cart items count ${cartCount}`}>{cartCount}</span>
            </AppNavLink>
            <AppNavLink to="/admin">Admin</AppNavLink>
            <button
              type="button"
              className="btn btnGhost"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title="Toggle theme"
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </nav>
        </div>
      </header>

      <main className="Main" role="main">
        <div className="Container">{children}</div>
      </main>

      <footer className="Footer" role="contentinfo">
        <div className="Container Footer__inner">
          <span>© {new Date().getFullYear()} Fashion Retail</span>
          <span className="Footer__spacer" aria-hidden="true" />
          <span className="Footer__muted">Preview UI skeleton (routing/layout/theme)</span>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
