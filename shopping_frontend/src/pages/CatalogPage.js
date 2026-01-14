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
 * - Deletes keys when value is empty ("" or whitespace)
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
 * @returns {{id: string, title: string, price: number, currency?: string, images?: string[], category?: string, brand?: string, createdAt?: string}}
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
    // Optional - helps "newest" sorting in mock fallback if present later.
    createdAt: p?.createdAt ? String(p.createdAt) : '',
  };
}

/**
 * Safely parses a number-like string. Returns undefined for empty/invalid inputs.
 * @param {string} v
 * @returns {number|undefined}
 */
function parseNumberOrUndefined(v) {
  const trimmed = (v ?? '').trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Client-side filtering used:
 * - for mock fallback
 * - as a safety net if backend doesn't support category/price range filters yet
 *
 * @param {ReturnType<typeof normalizeProductListItem>[]} items
 * @param {{ q: string, category: string, minPrice?: number, maxPrice?: number }} filters
 * @returns {ReturnType<typeof normalizeProductListItem>[]}
 */
function filterClientSide(items, filters) {
  const q = (filters.q || '').trim().toLowerCase();
  const category = (filters.category || '').trim().toLowerCase();
  const minPrice = typeof filters.minPrice === 'number' ? filters.minPrice : undefined;
  const maxPrice = typeof filters.maxPrice === 'number' ? filters.maxPrice : undefined;

  return items.filter((p) => {
    const price = typeof p.price === 'number' ? p.price : Number(p.price ?? 0);

    if (category && String(p.category || '').toLowerCase() !== category) return false;
    if (minPrice != null && price < minPrice) return false;
    if (maxPrice != null && price > maxPrice) return false;

    if (!q) return true;
    const hay = `${p.title} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Client-side sorting used:
 * - for mock fallback
 * - as a consistent UI behavior when backend ignores `sort`
 *
 * @param {ReturnType<typeof normalizeProductListItem>[]} items
 * @param {string} sort
 * @param {string} q
 * @returns {ReturnType<typeof normalizeProductListItem>[]}
 */
function sortClientSide(items, sort, q) {
  const s = (sort || '').trim();
  const copy = [...items];

  // Default sort:
  // - if q present => relevance (keep backend order / input order)
  // - else newest (keep backend order; for mock, apply stable "newest" heuristic)
  if (!s) {
    if (q) return copy;
    // mock dataset is in a reasonable order already; still return stable copy.
    return copy;
  }

  if (s === 'relevance') return copy;
  if (s === 'price_asc') return copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (s === 'price_desc') return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  if (s === 'newest') {
    // Prefer createdAt if present; otherwise fall back to keeping existing order.
    const anyHasCreatedAt = copy.some((p) => Boolean(p.createdAt));
    if (!anyHasCreatedAt) return copy;
    return copy.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  return copy;
}

// PUBLIC_INTERFACE
function CatalogPage() {
  /** Product catalog page with responsive grid, URL-based search, filters, and sorting. */
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => toParams(location.search), [location.search]);

  // URL-driven state (single source of truth)
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? ''; // relevance | newest | price_asc | price_desc
  const minPrice = parseNumberOrUndefined(params.get('minPrice') ?? '');
  const maxPrice = parseNumberOrUndefined(params.get('maxPrice') ?? '');

  // UI-only state for numeric inputs (keep them editable even if invalid mid-typing)
  const [minPriceInput, setMinPriceInput] = useState(params.get('minPrice') ?? '');
  const [maxPriceInput, setMaxPriceInput] = useState(params.get('maxPrice') ?? '');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // If backend errors, we still show results via mock fallback (and display banner).
  const [usingMock, setUsingMock] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Keep local input fields in sync when URL changes (e.g., using back/forward).
  useEffect(() => {
    setMinPriceInput(params.get('minPrice') ?? '');
    setMaxPriceInput(params.get('maxPrice') ?? '');
    // We intentionally depend on location.key to catch navigation even if query string matches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Derive categories from current items so the filter stays relevant even if backend doesn't have categories endpoint.
  const categories = useMemo(() => {
    const set = new Set();
    for (const p of items) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered = filterClientSide(items, { q, category, minPrice, maxPrice });
    return sortClientSide(filtered, sort || (q ? 'relevance' : 'newest'), q);
  }, [items, q, category, minPrice, maxPrice, sort]);

  /**
   * Updates URL query params for this page while preserving unspecified keys.
   * @param {Record<string,string>} updates
   */
  const updateQuery = (updates) => {
    const next = buildSearchString(params, updates);
    navigate({ pathname: '/catalog', search: next }, { replace: false });
  };

  const handleApplyPrice = () => {
    // Normalize: allow clearing, and prevent inverted ranges by auto-swapping.
    const min = parseNumberOrUndefined(minPriceInput);
    const max = parseNumberOrUndefined(maxPriceInput);

    if (min != null && max != null && min > max) {
      // Swap to keep UX forgiving.
      updateQuery({ minPrice: String(max), maxPrice: String(min) });
      return;
    }

    updateQuery({
      minPrice: min != null ? String(min) : '',
      maxPrice: max != null ? String(max) : '',
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText('');

      // Default sort choice mirrors the contract guidance:
      // - relevance if q is present
      // - newest otherwise
      const effectiveSort = sort || (q ? 'relevance' : 'newest');

      try {
        // Contract: GET /products supports q and sort.
        // Category/min/max are not explicitly defined, but we can still send for forward-compatibility.
        const data = await get('/products', {
          ...(q ? { q } : {}),
          ...(effectiveSort ? { sort: effectiveSort } : {}),
          ...(category ? { category } : {}),
          ...(minPrice != null ? { minPrice } : {}),
          ...(maxPrice != null ? { maxPrice } : {}),
          page: 1,
          pageSize: 40,
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
              : 'Could not load products — showing mock products.'
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
    // Re-fetch when URL-driven inputs change.
  }, [q, category, sort, minPrice, maxPrice]);

  const hasAnyFilters = Boolean(q || category || sort || minPrice != null || maxPrice != null);

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
            <span className="Field__label">Sort</span>
            <select
              className="Input"
              value={sort || (q ? 'relevance' : 'newest')}
              onChange={(e) => updateQuery({ sort: e.target.value })}
              aria-label="Sort products"
            >
              <option value="relevance" disabled={!q}>
                Relevance
              </option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </label>

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

          <div className="Field CatalogFilters__field" aria-label="Filter by price range">
            <span className="Field__label">Price range</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                className="Input"
                inputMode="decimal"
                placeholder="Min"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                aria-label="Minimum price"
              />
              <input
                className="Input"
                inputMode="decimal"
                placeholder="Max"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                aria-label="Maximum price"
              />
            </div>
            <div className="InlineActions" style={{ marginTop: 10 }}>
              <button type="button" className="btn btnSecondary" onClick={handleApplyPrice}>
                Apply
              </button>
              <button
                type="button"
                className="btn btnGhost"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  updateQuery({ minPrice: '', maxPrice: '' });
                }}
                disabled={!(params.get('minPrice') || params.get('maxPrice'))}
              >
                Clear price
              </button>
            </div>
          </div>

          <div className="InlineActions CatalogFilters__actions">
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => {
                setMinPriceInput('');
                setMaxPriceInput('');
                updateQuery({ q: '', category: '', sort: '', minPrice: '', maxPrice: '' });
              }}
              disabled={!hasAnyFilters}
            >
              Clear all
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
          <p className="Muted">Try a different search term or clear filters.</p>
          <div className="InlineActions">
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                setMinPriceInput('');
                setMaxPriceInput('');
                updateQuery({ q: '', category: '', sort: '', minPrice: '', maxPrice: '' });
              }}
            >
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
            {minPrice != null || maxPrice != null ? (
              <>
                {' '}
                <span className="CatalogMetaDot"> • </span>
                <span className="Pill">
                  ${minPrice != null ? minPrice.toFixed(0) : '0'}–$
                  {maxPrice != null ? maxPrice.toFixed(0) : '∞'}
                </span>
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
