import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { get } from '../lib/apiClient';
import { getMockProducts } from '../lib/mockProducts';

/**
 * Reads the current URL query string into a URLSearchParams instance.
 * @param {string} search
 * @returns {URLSearchParams}
 */
function toParams(search) {
  return new URLSearchParams(search || '');
}

/**
 * Builds a new search string by applying updates to current params.
 * - Deletes keys when value is empty
 * - Preserves other existing keys
 *
 * @param {URLSearchParams} currentParams
 * @param {Record<string, string>} updates
 * @returns {string} search string with leading "?" or empty string
 */
function buildSearchString(currentParams, updates) {
  const next = new URLSearchParams(currentParams);
  for (const [k, v] of Object.entries(updates)) {
    const trimmed = (v ?? '').trim();
    if (!trimmed) next.delete(k);
    else next.set(k, trimmed);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Normalizes a product list item into the minimal shape expected by the grid.
 * The backend contract defines "items" with minimal fields; mock uses the same.
 *
 * @param {any} p
 * @returns {{id: string, title: string, price: number, currency?: string, images?: string[], category?: string, brand?: string}}
 */
function normalizeProductListItem(p) {
  return {
    id: String(p?.id ?? ''),
    title: String(p?.title ?? 'Untitled'),
    price: typeof p?.price === 'number' ? p.price : Number(p?.price ?? 0),
    currency: p?.currency ? String(p.currency) : 'USD',
    images: Array.isArray(p?.images) ? p.images : [],
    category: p?.category ? String(p.category) : '',
    brand: p?.brand ? String(p.brand) : '',
  };
}

/**
 * In-memory filter used as a fallback when backend can't filter by category yet,
 * or when we're displaying mock data.
 *
 * @param {ReturnType<typeof normalizeProductListItem>[]} items
 * @param {{ q: string, category: string }} filters
 */
function filterClientSide(items, filters) {
  const q = (filters.q || '').trim().toLowerCase();
  const category = (filters.category || '').trim().toLowerCase();

  return items.filter((p) => {
    if (category && String(p.category || '').toLowerCase() !== category) return false;
    if (!q) return true;

    const hay = `${p.title} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

// PUBLIC_INTERFACE
function CatalogPage() {
  /** Product catalog page with responsive grid, URL-based search, and basic category filtering. */
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => toParams(location.search), [location.search]);
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // If backend errors, we still show results via mock fallback (and display banner).
  const [usingMock, setUsingMock] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Derive categories from current items so the filter stays relevant.
  const categories = useMemo(() => {
    const set = new Set();
    for (const p of items) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visibleItems = useMemo(
    () => filterClientSide(items, { q, category }),
    [items, q, category]
  );

  // Keep the app-level search bar working by continuing to use "?q=".
  // This page adds "category" and still preserves q.
  const updateQuery = (updates) => {
    const next = buildSearchString(params, updates);
    navigate({ pathname: '/', search: next }, { replace: false });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText('');

      try {
        // Contract: GET /products supports q; category is not explicitly defined in the contract,
        // but we can still send it as a query param for forward-compatibility.
        const data = await get('/products', {
          ...(q ? { q } : {}),
          ...(category ? { category } : {}),
          page: 1,
          pageSize: 40,
          sort: q ? 'relevance' : 'newest',
        });

        const serverItems = Array.isArray(data?.items) ? data.items : [];
        const normalized = serverItems.map(normalizeProductListItem);

        if (!cancelled) {
          setUsingMock(false);
          setItems(normalized);
        }
      } catch (err) {
        // Graceful fallback: if backend is unreachable, show mock data and a banner.
        // We avoid hard-failing the UX for demos/dev.
        const isNetwork =
          Boolean(err && typeof err === 'object' && (err.network || err.timeout)) ||
          /network/i.test(String(err?.message || ''));

        const fallback = getMockProducts().map(normalizeProductListItem);
        if (!cancelled) {
          setUsingMock(true);
          setItems(fallback);

          setErrorText(
            isNetwork
              ? 'Backend unavailable — showing mock products.'
              : `Could not load products — showing mock products.`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [q, category]);

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Catalog</h1>
          <p className="PageSubtitle">
            {q ? (
              <>
                Showing results for <span className="Pill">“{q}”</span>
              </>
            ) : (
              'Browse our latest arrivals.'
            )}
          </p>
        </div>

        <div className="CatalogFilters" aria-label="Catalog filters">
          <label className="Field CatalogFilters__field">
            <span className="Field__label">Category</span>
            <select
              className="Input"
              value={category}
              onChange={(e) => updateQuery({ category: e.target.value })}
              aria-label="Filter by category"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="InlineActions CatalogFilters__actions">
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => updateQuery({ q: '', category: '' })}
              disabled={!q && !category}
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {(errorText || usingMock) && (
        <section className="Card Card--padded CatalogBanner" role="status" aria-live="polite">
          <p className="Muted" style={{ margin: 0 }}>
            {errorText || 'Showing mock products.'}
          </p>
        </section>
      )}

      {loading ? (
        <section className="Card Card--padded" aria-busy="true">
          <p className="Muted" style={{ margin: 0 }}>
            Loading products…
          </p>
        </section>
      ) : visibleItems.length === 0 ? (
        <section className="Card Card--padded">
          <h2 className="SectionTitle">No results</h2>
          <p className="Muted">
            Try a different search term or clear filters.
          </p>
          <div className="InlineActions">
            <button type="button" className="btn btnPrimary" onClick={() => updateQuery({ q: '', category: '' })}>
              Reset filters
            </button>
          </div>
        </section>
      ) : (
        <>
          <p className="Muted CatalogSummary" aria-label="Results summary">
            Showing <strong>{visibleItems.length}</strong> item{visibleItems.length === 1 ? '' : 's'}
            {category ? (
              <>
                {' '}
                in <span className="Pill">{category}</span>
              </>
            ) : null}
          </p>

          <section className="Grid" aria-label="Product grid">
            {visibleItems.map((p) => {
              const imageUrl = Array.isArray(p.images) && p.images.length ? p.images[0] : '';

              return (
                <article key={p.id} className="Card">
                  <div className="Card__media">
                    {imageUrl ? (
                      <img
                        className="ProductCard__img"
                        src={imageUrl}
                        alt={p.title}
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken images but keep layout stable.
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="Card__body">
                    <h2 className="Card__title">{p.title}</h2>
                    <p className="Card__meta">
                      {typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : '$0.00'}
                      {p.category ? <span className="CatalogMetaDot"> • </span> : null}
                      {p.category ? p.category : null}
                    </p>

                    <div className="Card__actions">
                      <Link className="btn btnPrimary" to={`/product/${encodeURIComponent(p.id)}`}>
                        View
                      </Link>
                      <button className="btn btnSecondary" type="button" disabled>
                        Add to cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

export default CatalogPage;
