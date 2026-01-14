import { isMockApiEnabled } from '../config/env';
import { httpJson } from './http';
import {
  mockAdminCreateProduct,
  mockAdminDeleteProduct,
  mockAdminUpdateProduct,
  mockCheckout,
  mockGetProduct,
  mockListProducts,
  mockLogin,
} from './mockApi';

// NOTE: Backend route paths are best-effort. If backend differs, enable MOCK_API via feature flags.

// PUBLIC_INTERFACE
export async function listProducts({ q } = {}) {
  /** List products (supports query search). */
  if (isMockApiEnabled()) return mockListProducts({ q });

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return httpJson(`/products${qs}`);
}

// PUBLIC_INTERFACE
export async function getProduct(productId) {
  /** Fetch product detail. */
  if (isMockApiEnabled()) return mockGetProduct(productId);
  return httpJson(`/products/${encodeURIComponent(productId)}`);
}

// PUBLIC_INTERFACE
export async function login({ email, password }) {
  /** Login and return { token, user }. */
  if (isMockApiEnabled()) return mockLogin({ email, password });
  return httpJson(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) });
}

// PUBLIC_INTERFACE
export async function checkout({ cartItems, shipping, token }) {
  /** Create an order from cart items + shipping info. */
  if (isMockApiEnabled()) return mockCheckout({ cartItems, shipping });

  return httpJson(`/checkout`, {
    method: 'POST',
    body: JSON.stringify({ cartItems, shipping }),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// PUBLIC_INTERFACE
export async function adminCreateProduct({ product, token }) {
  /** Admin: create a product. */
  if (isMockApiEnabled()) return mockAdminCreateProduct(product);

  return httpJson(`/admin/products`, {
    method: 'POST',
    body: JSON.stringify(product),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// PUBLIC_INTERFACE
export async function adminUpdateProduct({ productId, product, token }) {
  /** Admin: update a product. */
  if (isMockApiEnabled()) return mockAdminUpdateProduct(productId, product);

  return httpJson(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// PUBLIC_INTERFACE
export async function adminDeleteProduct({ productId, token }) {
  /** Admin: delete a product. */
  if (isMockApiEnabled()) return mockAdminDeleteProduct(productId);

  return httpJson(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
