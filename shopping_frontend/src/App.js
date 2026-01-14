import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminProductEditPage from './pages/admin/AdminProductEditPage';
import AdminProductListPage from './pages/admin/AdminProductListPage';
import AdminProductNewPage from './pages/admin/AdminProductNewPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import './App.css';

function useQueryParam(key) {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(key) ?? '';
  }, [key, location.search]);
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Theme handling:
   * - Default to light (per style guide)
   * - Persist user's choice to localStorage
   * - Apply to <html data-theme="..."> so CSS variables work globally
   */
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const navigate = useNavigate();
  const q = useQueryParam('q');

  // Keep the search input controlled by the URL (simple and shareable)
  const handleSearchSubmit = (nextQ) => {
    const trimmed = (nextQ ?? '').trim();
    const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
    navigate(`/${qs}`);
  };

  return (
    <AppLayout
      theme={theme}
      onToggleTheme={toggleTheme}
      searchValue={q}
      onSearchSubmit={handleSearchSubmit}
      cartCount={0}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/products" element={<AdminProductListPage />} />
        <Route path="/admin/products/new" element={<AdminProductNewPage />} />
        <Route path="/admin/products/:id" element={<AdminProductEditPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
