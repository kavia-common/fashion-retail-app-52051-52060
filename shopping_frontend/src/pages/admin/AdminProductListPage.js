import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { get } from '../../lib/apiClient';
import { getMockProducts } from '../../lib/mockProducts';

/**
 * Reads a query param from the URL.
 * @param {string} key
 * @param {string} search
 * @returns {string}
 */
function getQueryParam(key, search) {
  const params = new URLSearchParams(search);
  return params.get(key) ?? '';
}

/**
 * Computes a "best effort" inventory number from a product.
 * The backend contract may or may not provide inventory directly; we support both.
 *
 * @param {any} product
 * @returns {number | undefined}
 */
function getInventoryCount(product) {
  if (!product || typeof product !== 'object') return undefined;

  if (typeof product.inventory === 'number') return product.inventory;

  if (Array.isArray(product.variants)) {
    const sum = product.variants.reduce((acc, v) => acc + (Number(v?.inventory) || 0), 0);
    return sum;
  }

  return undefined;
}

/**
 * Lightweight normalization so UI doesn't break if backend or mock fields differ.
 * @param {any} raw
 * @returns {{id: string, title: string, category?: string, brand?: string, price?: number, currency?: string, isActive?: boolean, inventory?: number | undefined}}
 */
function normalizeProduct(raw) {
  const id = String(raw?.id ?? '');
  return {
    id,
    title: String(raw?.title ?? raw?.name ?? `Product ${id}`),
    category: raw?.category ? String(raw.category) : undefined,
    brand: raw?.brand ? String(raw.brand) : undefined,
    price: typeof raw?.price === 'number' ? raw.price : raw?.price != null ? Number(raw.price) : undefined,
    currency: raw?.currency ? String(raw.currency) : 'USD',
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : raw?.isActive != null ? Boolean(raw.isActive) : undefined,
    inventory: getInventoryCount(raw),
  };
}

/**
 * Simple client-side filter for mock fallback (and for robustness).
 * @param {Array<any>} items
 * @param {string} query
 * @returns {Array<any>}
 */
function filterProducts(items, query) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return items;

  return items.filter((p) => {
    const title = String(p?.title ?? '').toLowerCase();
    const category = String(p?.category ?? '').toLowerCase();
    const brand = String(p?.brand ?? '').toLowerCase();
    const id = String(p?.id ?? '').toLowerCase();
    return title.includes(q) || category.includes(q) || brand.includes(q) || id.includes(q);
  });
}

// PUBLIC_INTERFACE
function AdminProductListPage() {
  /** Admin products list/search page (uses backend API with mock fallback). */
  const location = useLocation();
  const navigate = useNavigate();

  const urlQ = useMemo(() => getQueryParam('q', location.search), [location.search]);

  const [searchText, setSearchText] = useState(urlQ);
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error
  const [products, setProducts] = useState([]);
  const [source, setSource] = useState('api'); // api | mock
  const [errorMessage, setErrorMessage] = useState('');

  // Keep local input in sync when URL changes (back/forward, external navigation).
  useEffect(() => setSearchText(urlQ), [urlQ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setErrorMessage('');

      // Attempt backend first.
      try {
        // Contract assumed similar to catalog usage: GET /products?q=...
        // If backend doesn't support q, it should still return a list.
        const data = await get('/products', urlQ ? { q: urlQ } : undefined);

        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const normalized = items.map(normalizeProduct);

        if (!cancelled) {
          setProducts(filterProducts(normalized, urlQ));
          setSource('api');
          setStatus('loaded');
        }
        return;
      } catch (err) {
        // Fall back to mock below.
        const msg = err && typeof err.message === 'string' ? err.message : 'Failed to load products';
        if (!cancelled) setErrorMessage(msg);
      }

      // Mock fallback (always client-side filtered).
      const mock = getMockProducts().map(normalizeProduct);
      if (!cancelled) {
        setProducts(filterProducts(mock, urlQ));
        setSource('mock');
        setStatus('loaded');
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [urlQ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = (searchText ?? '').trim();
    const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
    navigate(`/admin/products${qs}`);
  };

  const clearSearch = () => {
    setSearchText('');
    navigate('/admin/products');
  };

  const resultsLabel = useMemo(() => {
    const q = (urlQ ?? '').trim();
    if (!q) return `${products.length} products`;
    return `${products.length} results for “${q}”`;
  }, [products.length, urlQ]);

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Admin Products</h1>
          <p className="PageSubtitle">
            Search and manage catalog items.{' '}
            {source === 'mock' ? (
              <span className="Badge" title="Backend unavailable; showing mock data">
                Mock data
              </span>
            ) : (
              <span className="Badge" title="Loaded from backend API">
                Live
              </span>
            )}
          </p>
        </div>

        <div className="InlineActions">
          <Link className="btn btnPrimary" to="/admin/products/new">
            New product
          </Link>
        </div>
      </header>

      <section className="Card Card--padded" aria-label="Admin product search">
        <form className="InlineActions" onSubmit={handleSubmit}>
          <label className="srOnly" htmlFor="adminProductSearch">
            Search products
          </label>
          <input
            id="adminProductSearch"
            className="Input"
            type="search"
            placeholder="Search by title, category, brand, or id…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button type="submit" className="btn btnPrimary" disabled={status === 'loading'}>
            Search
          </button>
          <button type="button" className="btn btnSecondary" onClick={clearSearch} disabled={status === 'loading'}>
            Clear
          </button>
        </form>

        {status === 'loading' ? (
          <p className="Muted" style={{ marginTop: 12 }}>
            Loading products…
          </p>
        ) : null}

        {status !== 'loading' && errorMessage ? (
          <p className="Muted" style={{ marginTop: 12 }}>
            Note: {errorMessage}. Showing fallback data if available.
          </p>
        ) : null}
      </section>

      <section className="Card Card--padded" style={{ marginTop: 16 }} aria-label="Admin product list">
        <div className="InlineActions" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="SectionTitle" style={{ margin: 0 }}>
            {resultsLabel}
          </div>
          <Link className="btn btnGhost" to="/admin">
            Back to Admin
          </Link>
        </div>

        <div className="TableWrap" style={{ marginTop: 12, overflowX: 'auto' }}>
          <table className="Table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Title</th>
                <th align="left">Category</th>
                <th align="left">Brand</th>
                <th align="right">Price</th>
                <th align="right">Inventory</th>
                <th align="left">Status</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="Muted" style={{ paddingTop: 12 }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div className="Muted" style={{ fontSize: 12 }}>
                        ID: {p.id}
                      </div>
                    </td>
                    <td>{p.category || <span className="Muted">—</span>}</td>
                    <td>{p.brand || <span className="Muted">—</span>}</td>
                    <td align="right">
                      {typeof p.price === 'number' ? (
                        <>
                          {p.currency || 'USD'} {p.price.toFixed(2)}
                        </>
                      ) : (
                        <span className="Muted">—</span>
                      )}
                    </td>
                    <td align="right">{typeof p.inventory === 'number' ? p.inventory : <span className="Muted">—</span>}</td>
                    <td>
                      {typeof p.isActive === 'boolean' ? (
                        p.isActive ? (
                          <span className="Badge">Active</span>
                        ) : (
                          <span className="Badge" style={{ opacity: 0.75 }}>
                            Inactive
                          </span>
                        )
                      ) : (
                        <span className="Muted">—</span>
                      )}
                    </td>
                    <td align="right">
                      <Link className="btn btnGhost" to={`/admin/products/${encodeURIComponent(p.id)}/edit`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminProductListPage;
