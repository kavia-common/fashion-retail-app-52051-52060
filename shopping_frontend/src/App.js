import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './styles/theme.css';

import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

// PUBLIC_INTERFACE
function App() {
  /** Root application component (routes, layout shell). */
  return (
    <div className="appRoot">
      <NavBar />

      <main className="appMain">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>

      <footer className="appFooter">
        <div className="container footerInner">
          <span className="mutedText">Fashion Retail • Demo storefront</span>
          <a className="link" href="/" onClick={(e) => e.preventDefault()}>
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
