import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { get } from '../lib/apiClient';
import { getMockProductById, getMockProducts } from '../lib/mockProducts';

function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  // Keep it simple and consistent; currency formatting can be upgraded later.
  return `$${safe.toFixed(2)}${currency ? ` ${currency}` : ''}`;
}

/**
 * @param {any} p
 * @returns {any|null}
 */
function normalizeProduct(p) {
  if (!p) return null;

  const images = Array.isArray(p.images) ? p.images.filter(Boolean).map(String) : [];
  const variants = Array.isArray(p.variants) ? p.variants : [];

  // Inventory:
  // - if variants exist: inventory is derived from selected variant
  // - else: use product.inventory (number) if present, else assume 0 for safety
  const inventory = typeof p.inventory === 'number' ? p.inventory : Number(p.inventory ?? 0);

  // Badges: allow either p.badges or p.tags (best-effort)
  const badges = Array.isArray(p.badges)
    ? p.badges.map(String)
    : Array.isArray(p.tags)
      ? p.tags.map(String)
      : [];

  return {
    id: String(p.id ?? ''),
    title: String(p.title ?? 'Untitled product'),
    description: String(p.description ?? ''),
    brand: p.brand ? String(p.brand) : '',
    category: p.category ? String(p.category) : '',
    price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0),
    currency: p.currency ? String(p.currency) : 'USD',
    images,
    badges,
    variants,
    inventory,
  };
}

function getFriendlyErrorMessage(err) {
  const message = String(err?.message || '').trim();
  if (err?.timeout) return 'Request timed out. Please check your connection and try again.';
  if (err?.network) return 'Cannot reach the backend right now. You can still view a mock product preview.';
  if (message) return message;
  return 'Something went wrong while loading this product.';
}

/**
 * Derives variant option axes from a variant array.
 * We specifically support `size` and `color` keys (per API contract), but we avoid breaking
 * if only one exists.
 *
 * @param {any[]} variants
 * @returns {{ hasVariants: boolean, sizes: string[], colors: string[], hasSize: boolean, hasColor: boolean }}
 */
function deriveVariantAxes(variants) {
  const sizesSet = new Set();
  const colorsSet = new Set();

  for (const v of variants || []) {
    if (v?.size != null && String(v.size).trim()) sizesSet.add(String(v.size));
    if (v?.color != null && String(v.color).trim()) colorsSet.add(String(v.color));
  }

  const sizes = Array.from(sizesSet);
  const colors = Array.from(colorsSet);

  // Keep stable order (string compare) for consistent keyboard navigation.
  sizes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  colors.sort((a, b) => a.localeCompare(b));

  const hasSize = sizes.length > 0;
  const hasColor = colors.length > 0;

  return {
    hasVariants: (variants || []).length > 0 && (hasSize || hasColor),
    sizes,
    colors,
    hasSize,
    hasColor,
  };
}

/**
 * Finds the best matching variant for current selections.
 * @param {any[]} variants
 * @param {{ size?: string, color?: string }} selection
 * @returns {any|null}
 */
function findSelectedVariant(variants, selection) {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  const sizeSel = selection.size ? String(selection.size) : '';
  const colorSel = selection.color ? String(selection.color) : '';

  // Prefer exact match on both axes when provided.
  const exact = variants.find((v) => {
    const s = v?.size != null ? String(v.size) : '';
    const c = v?.color != null ? String(v.color) : '';
    const sizeOk = sizeSel ? s === sizeSel : true;
    const colorOk = colorSel ? c === colorSel : true;
    return sizeOk && colorOk;
  });

  if (exact) return exact;

  // Otherwise pick the first in-stock variant as a sensible fallback.
  const firstInStock = variants.find((v) => Number(v?.inventory ?? 0) > 0);
  return firstInStock || variants[0] || null;
}

/**
 * Returns true when option (size/color) has at least one matching in-stock variant.
 * @param {any[]} variants
 * @param {{ size?: string, color?: string }} selection
 * @param {{ axis: 'size'|'color', value: string }} option
 * @returns {boolean}
 */
function isOptionInStock(variants, selection, option) {
  if (!Array.isArray(variants) || variants.length === 0) return false;
  const desired = String(option.value);

  return variants.some((v) => {
    const inv = Number(v?.inventory ?? 0);
    if (!(inv > 0)) return false;

    const size = v?.size != null ? String(v.size) : '';
    const color = v?.color != null ? String(v.color) : '';

    const matchesOption = option.axis === 'size' ? size === desired : color === desired;
    if (!matchesOption) return false;

    // Respect the *other* axis selection if set.
    const sizeOk = selection.size ? size === String(selection.size) : true;
    const colorOk = selection.color ? color === String(selection.color) : true;

    // If the option axis is size, keep color constraint; if axis is color, keep size constraint.
    if (option.axis === 'size') return colorOk;
    return sizeOk;
  });
}

/**
 * Inventory messaging rules:
 * - In stock
 * - Low stock when qty < 5
 * - Out of stock when qty <= 0
 *
 * @param {number} quantity
 * @returns {{ label: string, tone: 'ok'|'low'|'out' }}
 */
function getInventoryMessage(quantity) {
  const q = Number(quantity ?? 0);
  if (!(q > 0)) return { label: 'Out of stock', tone: 'out' };
  if (q < 5) return { label: `Low stock (${q} left)`, tone: 'low' };
  return { label: 'In stock', tone: 'ok' };
}

function ProductDetailsSkeleton() {
  return (
    <div className="Page" aria-label="Loading product" aria-busy="true">
      <header className="PageHeader">
        <div className="CatalogSkeleton__line CatalogSkeleton__line--title" style={{ width: '55%' }} />
        <div className="CatalogSkeleton__line CatalogSkeleton__line--meta" style={{ width: '35%' }} />
      </header>

      <div className="TwoCol">
        <section className="Card Card--padded">
          <div className="ProductDetails__media">
            <div className="CatalogSkeleton__media" style={{ borderRadius: 14 }} />
          </div>
          <div className="ProductDetails__thumbRow" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ProductDetails__thumb ProductDetails__thumb--skeleton" />
            ))}
          </div>
        </section>

        <section className="Card Card--padded">
          <div className="CatalogSkeleton__line CatalogSkeleton__line--title" style={{ width: '70%' }} />
          <div className="CatalogSkeleton__line" style={{ width: '45%' }} />
          <div className="CatalogSkeleton__line" style={{ width: '90%' }} />
          <div className="CatalogSkeleton__line" style={{ width: '85%' }} />
          <div className="Card__actions" style={{ marginTop: 10 }}>
            <div className="CatalogSkeleton__pill" />
            <div className="CatalogSkeleton__pill CatalogSkeleton__pill--secondary" />
          </div>
        </section>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function ProductDetailsPage() {
  /** Product details view: loads product by id, shows gallery, variants, inventory messaging, and add-to-cart stub. */
  const { id } = useParams();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [variantSelection, setVariantSelection] = useState({ size: '', color: '' });

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [usingMock, setUsingMock] = useState(false);

  // Manual retry.
  const [reloadTick, setReloadTick] = useState(0);

  // For focus management when error resolves / product loads
  const titleRef = useRef(null);

  const catalogBackLink = useMemo(() => {
    // Preserve query params if present; source is typically catalog filters.
    const qs = location.search ? location.search : '';
    return `/catalog${qs}`;
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText('');
      setUsingMock(false);
      setProduct(null);

      try {
        const data = await get(`/products/${encodeURIComponent(String(id))}`);
        const normalized = normalizeProduct(data);

        if (!cancelled) {
          setUsingMock(false);
          setProduct(normalized);
        }
      } catch (err) {
        const fallback = normalizeProduct(getMockProductById(id));
        if (!cancelled) {
          setUsingMock(true);
          setErrorText(getFriendlyErrorMessage(err));
          setProduct(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  // Reset gallery index on product change.
  useEffect(() => {
    setActiveImageIdx(0);
  }, [product?.id]);

  // When product loads, move focus to title for better SR/keyboard flow.
  useEffect(() => {
    if (!loading && product && titleRef.current) {
      titleRef.current.focus();
    }
  }, [loading, product]);

  const axes = useMemo(() => deriveVariantAxes(product?.variants || []), [product?.variants]);

  // Establish initial variant selection when product is loaded.
  useEffect(() => {
    if (!product) return;

    if (!axes.hasVariants) {
      setVariantSelection({ size: '', color: '' });
      return;
    }

    const v0 = findSelectedVariant(product.variants, { size: '', color: '' });
    const next = {
      size: v0?.size != null ? String(v0.size) : '',
      color: v0?.color != null ? String(v0.color) : '',
    };
    setVariantSelection(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, axes.hasVariants]);

  const selectedVariant = useMemo(() => {
    if (!product || !axes.hasVariants) return null;
    return findSelectedVariant(product.variants, variantSelection);
  }, [product, axes.hasVariants, variantSelection]);

  const activeImages = useMemo(() => {
    if (!product) return [];
    return Array.isArray(product.images) ? product.images : [];
  }, [product]);

  const activeImageUrl = activeImages[activeImageIdx] || '';

  const effectivePrice = useMemo(() => {
    // If variant provides a price, use it; otherwise fall back to product price.
    if (selectedVariant && selectedVariant.price != null) {
      const pv = Number(selectedVariant.price);
      if (Number.isFinite(pv)) return pv;
    }
    return product?.price ?? 0;
  }, [product?.price, selectedVariant]);

  const effectiveCurrency = product?.currency || 'USD';

  const effectiveInventory = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant) return Number(selectedVariant.inventory ?? 0);
    // No variants: use product-level inventory
    return Number(product.inventory ?? 0);
  }, [product, selectedVariant]);

  const inventoryMsg = useMemo(() => getInventoryMessage(effectiveInventory), [effectiveInventory]);

  const addDisabled = !(effectiveInventory > 0);

  const badgeList = useMemo(() => {
    const fromProduct = Array.isArray(product?.badges) ? product.badges : [];
    // Allow common "New/Sale" signals from tags as well, if backend uses tags.
    const normalized = fromProduct
      .map((b) => String(b || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return normalized;
  }, [product?.badges]);

  const relatedProducts = useMemo(() => {
    // Placeholder: show a few items from mock set, excluding current product if it exists there.
    const all = getMockProducts();
    const filtered = all.filter((p) => String(p.id) !== String(product?.id));
    return filtered.slice(0, 4);
  }, [product?.id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (addDisabled) return;

    const detail = {
      productId: product.id,
      variantId: selectedVariant?.variantId ? String(selectedVariant.variantId) : undefined,
      quantity: 1,
    };

    // Custom event stub for Step 06 wiring.
    window.dispatchEvent(new CustomEvent('shopping:addToCart', { detail }));

    // Keep current behavior a no-op beyond event emission.
    // You may add a toast later once a notification system exists.
  };

  if (loading) return <ProductDetailsSkeleton />;

  // 404-style empty state when product not found (both API and mock miss).
  if (!product || !product.id) {
    return (
      <div className="Page">
        <header className="PageHeader">
          <h1 className="PageTitle">Product not found</h1>
          <p className="PageSubtitle">We couldn’t find that product. It may have been removed or is unavailable.</p>
        </header>

        <section className="Card Card--padded">
          <p className="Muted">Try returning to the catalog or searching for something else.</p>
          <div className="InlineActions">
            <Link className="btn btnPrimary" to={catalogBackLink}>
              Back to catalog
            </Link>
            <button className="btn btnGhost" type="button" onClick={() => setReloadTick((t) => t + 1)}>
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="Page">
      <header className="PageHeader ProductDetails__header">
        <div className="ProductDetails__breadcrumbs">
          <Link className="btn btnGhost" to={catalogBackLink} aria-label="Back to catalog">
            ← Back to catalog
          </Link>
          {product.category ? <span className="Pill" aria-label={`Category ${product.category}`}>{product.category}</span> : null}
          {product.brand ? <span className="Pill" aria-label={`Brand ${product.brand}`}>{product.brand}</span> : null}
        </div>

        {usingMock || errorText ? (
          <section className="Card Card--padded ProductDetails__banner" role="status" aria-live="polite">
            <div className="ProductDetails__bannerRow">
              <p className="Muted" style={{ margin: 0 }}>
                {errorText || 'Backend unavailable. Showing mock product preview.'}
              </p>
              <button className="btn btnGhost" type="button" onClick={() => setReloadTick((t) => t + 1)}>
                Retry
              </button>
            </div>
          </section>
        ) : null}
      </header>

      <div className="TwoCol">
        {/* Gallery */}
        <section className="Card Card--padded" aria-label="Product images">
          <div className="ProductDetails__media">
            {activeImageUrl ? (
              <img
                className="ProductDetails__mainImg"
                src={activeImageUrl}
                alt={`${product.title} image ${activeImageIdx + 1} of ${activeImages.length}`}
                onError={(e) => {
                  // Hide broken image and show fallback background.
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.closest('.ProductDetails__media')?.classList.add('ProductDetails__media--fallback');
                }}
              />
            ) : (
              <div className="ProductDetails__imgFallback" aria-label="No product image available" />
            )}

            {badgeList.length ? (
              <div className="ProductDetails__badgeRow" aria-label="Product badges">
                {badgeList.map((b) => (
                  <span key={b} className="ProductDetails__badge">
                    {b}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {activeImages.length > 1 ? (
            <div className="ProductDetails__thumbRow" role="list" aria-label="Thumbnail gallery">
              {activeImages.map((src, idx) => {
                const isActive = idx === activeImageIdx;
                return (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    className={`ProductDetails__thumb ${isActive ? 'ProductDetails__thumb--active' : ''}`}
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`Show image ${idx + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <img
                      src={src}
                      alt=""
                      className="ProductDetails__thumbImg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('ProductDetails__thumb--fallback');
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Info */}
        <section className="Card Card--padded" aria-label="Product information">
          <h1 className="PageTitle ProductDetails__title" tabIndex={-1} ref={titleRef}>
            {product.title}
          </h1>

          <div className="ProductDetails__metaRow" aria-label="Price and availability">
            <div className="ProductDetails__price">{formatMoney(effectivePrice, product.currency)}</div>
            <div
              className={`ProductDetails__inventory ProductDetails__inventory--${inventoryMsg.tone}`}
              aria-label={`Inventory status: ${inventoryMsg.label}`}
            >
              {inventoryMsg.label}
            </div>
          </div>

          {product.description ? (
            <p className="Muted ProductDetails__description">{product.description}</p>
          ) : (
            <p className="Muted ProductDetails__description">No description provided.</p>
          )}

          {axes.hasVariants ? (
            <div className="ProductDetails__variants" aria-label="Product variants">
              <h2 className="SectionTitle" style={{ marginTop: 14 }}>
                Choose options
              </h2>

              {axes.hasColor ? (
                <fieldset className="ProductDetails__variantGroup">
                  <legend className="Field__label">Color</legend>
                  <div className="ProductDetails__chipRow" role="radiogroup" aria-label="Select color">
                    {axes.colors.map((c) => {
                      const selected = variantSelection.color === c;
                      const enabled = isOptionInStock(product.variants, variantSelection, { axis: 'color', value: c });

                      return (
                        <button
                          key={c}
                          type="button"
                          className={`ProductDetails__chip ${selected ? 'ProductDetails__chip--active' : ''}`}
                          onClick={() => setVariantSelection((prev) => ({ ...prev, color: c }))}
                          disabled={!enabled}
                          aria-pressed={selected}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {axes.hasSize ? (
                <fieldset className="ProductDetails__variantGroup">
                  <legend className="Field__label">Size</legend>
                  <div className="ProductDetails__chipRow" role="radiogroup" aria-label="Select size">
                    {axes.sizes.map((s) => {
                      const selected = variantSelection.size === s;
                      const enabled = isOptionInStock(product.variants, variantSelection, { axis: 'size', value: s });

                      return (
                        <button
                          key={s}
                          type="button"
                          className={`ProductDetails__chip ${selected ? 'ProductDetails__chip--active' : ''}`}
                          onClick={() => setVariantSelection((prev) => ({ ...prev, size: s }))}
                          disabled={!enabled}
                          aria-pressed={selected}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              <div className="ProductDetails__variantSummary" aria-label="Selected variant summary">
                <span className="Muted" style={{ margin: 0 }}>
                  Selected:{' '}
                  <span className="Pill">
                    {selectedVariant?.variantId
                      ? `${selectedVariant?.color ? String(selectedVariant.color) : ''}${selectedVariant?.size ? ` / ${String(selectedVariant.size)}` : ''}`.trim() ||
                        `Variant ${String(selectedVariant.variantId)}`
                      : '—'}
                  </span>
                </span>
              </div>
            </div>
          ) : null}

          <div className="InlineActions ProductDetails__actions">
            <button
              className="btn btnPrimary"
              type="button"
              onClick={handleAddToCart}
              disabled={addDisabled}
              aria-disabled={addDisabled ? 'true' : 'false'}
            >
              Add to cart
            </button>
            <Link className="btn btnSecondary" to="/cart">
              Go to cart
            </Link>
          </div>

          <p className="Muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tip: “Add to cart” currently emits a <span className="Pill">shopping:addToCart</span> browser event (wired in Step 06).
          </p>

          <hr className="ProductDetails__divider" />

          <section aria-label="Related products placeholder">
            <h2 className="SectionTitle">Related products</h2>
            <p className="Muted">Placeholder section (will be wired to recommendations later).</p>

            <div className="ProductDetails__relatedGrid" aria-label="Related products list">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  className="ProductDetails__relatedCard"
                  to={`/product/${encodeURIComponent(rp.id)}${location.search || ''}`}
                  aria-label={`View related product ${rp.title}`}
                >
                  <div className="ProductDetails__relatedTitle">{rp.title}</div>
                  <div className="ProductDetails__relatedMeta">{formatMoney(rp.price, rp.currency || effectiveCurrency)}</div>
                </Link>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

export default ProductDetailsPage;
