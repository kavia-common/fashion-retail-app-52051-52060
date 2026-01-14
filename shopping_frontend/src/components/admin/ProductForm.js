import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * @typedef {Object} ProductFormValue
 * @property {string} title
 * @property {string} category
 * @property {string} brand
 * @property {string} description
 * @property {string} price
 * @property {string} currency
 * @property {string} inventory
 * @property {string} imageUrl
 * @property {string} isActive
 */

/**
 * @param {any} err
 * @returns {string}
 */
function getFriendlyErrorMessage(err) {
  const message = String(err?.message || '').trim();
  if (err?.timeout) return 'Request timed out. Please check your connection and try again.';
  if (err?.network) return 'Cannot reach the backend right now. Changes will be saved locally (mock mode).';
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

/**
 * Very lightweight URL check for http(s) URLs.
 * @param {string} url
 * @returns {boolean}
 */
function isValidHttpUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return true; // optional
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {any} raw
 * @returns {ProductFormValue}
 */
function toFormValue(raw) {
  return {
    title: String(raw?.title ?? raw?.name ?? ''),
    category: String(raw?.category ?? ''),
    brand: String(raw?.brand ?? ''),
    description: String(raw?.description ?? ''),
    price:
      raw?.price == null
        ? ''
        : typeof raw.price === 'number'
          ? String(raw.price)
          : String(raw.price),
    currency: String(raw?.currency ?? 'USD'),
    // If product-level inventory exists use it; if variants exist, sum; otherwise blank.
    inventory:
      typeof raw?.inventory === 'number'
        ? String(raw.inventory)
        : Array.isArray(raw?.variants)
          ? String(
              raw.variants.reduce((acc, v) => acc + (Number(v?.inventory) || 0), 0)
            )
          : '',
    imageUrl: Array.isArray(raw?.images) && raw.images.length ? String(raw.images[0] || '') : '',
    isActive: raw?.isActive == null ? 'true' : String(Boolean(raw.isActive)),
  };
}

/**
 * @param {ProductFormValue} value
 * @returns {{ errors: Record<string,string>, isValid: boolean }}
 */
function validate(value) {
  const errors = {};

  const title = String(value.title || '').trim();
  const category = String(value.category || '').trim();
  const priceRaw = String(value.price || '').trim();
  const invRaw = String(value.inventory || '').trim();
  const imageUrl = String(value.imageUrl || '').trim();

  if (!title) errors.title = 'Name is required.';
  if (!category) errors.category = 'Category is required.';

  if (!priceRaw) {
    errors.price = 'Price is required.';
  } else {
    const priceNum = Number(priceRaw);
    if (!Number.isFinite(priceNum)) errors.price = 'Price must be a number.';
    else if (priceNum < 0) errors.price = 'Price must be ≥ 0.';
  }

  if (invRaw) {
    const invNum = Number(invRaw);
    if (!Number.isFinite(invNum)) errors.inventory = 'Inventory must be a number.';
    else if (invNum < 0) errors.inventory = 'Inventory cannot be negative.';
    else if (!Number.isInteger(invNum)) errors.inventory = 'Inventory must be a whole number.';
  }

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    errors.imageUrl = 'Image URL must be a valid http(s) URL.';
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/**
 * @param {string} id
 * @returns {any[]}
 */
function readLocalAdminProducts(id) {
  const key = `admin_products_mock_${id}`;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} id
 * @param {any[]} items
 */
function writeLocalAdminProducts(id, items) {
  const key = `admin_products_mock_${id}`;
  window.localStorage.setItem(key, JSON.stringify(items || []));
}

/**
 * @param {string} keyId
 * @param {any} product
 * @returns {any}
 */
function upsertLocalProduct(keyId, product) {
  const list = readLocalAdminProducts(keyId);
  const pid = String(product?.id || '');
  if (!pid) return product;

  const idx = list.findIndex((p) => String(p?.id) === pid);
  const next = idx >= 0 ? [...list.slice(0, idx), product, ...list.slice(idx + 1)] : [product, ...list];
  writeLocalAdminProducts(keyId, next);
  return product;
}

/**
 * @param {string} keyId
 * @param {any} product
 * @returns {any}
 */
function createLocalProduct(keyId, product) {
  const list = readLocalAdminProducts(keyId);

  const now = new Date().toISOString();
  const nextProduct = {
    ...product,
    id: product?.id ? String(product.id) : `local_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    createdAt: product?.createdAt || now,
    updatedAt: product?.updatedAt || now,
  };

  writeLocalAdminProducts(keyId, [nextProduct, ...list]);
  return nextProduct;
}

/**
 * @param {ProductFormValue} value
 * @param {{ id?: string }} [options]
 * @returns {any}
 */
function toApiPayload(value, options = {}) {
  const title = String(value.title || '').trim();
  const category = String(value.category || '').trim();
  const brand = String(value.brand || '').trim();
  const description = String(value.description || '').trim();
  const currency = String(value.currency || 'USD').trim() || 'USD';

  const priceNum = Number(String(value.price || '').trim());
  const invRaw = String(value.inventory || '').trim();
  const invNum = invRaw ? Number(invRaw) : undefined;

  const imageUrl = String(value.imageUrl || '').trim();

  return {
    ...(options.id ? { id: String(options.id) } : {}),
    title,
    category,
    brand: brand || undefined,
    description: description || undefined,
    price: Number.isFinite(priceNum) ? priceNum : 0,
    currency,
    images: imageUrl ? [imageUrl] : [],
    // This contract supports either product-level inventory or variants inventory.
    // We'll include product.inventory when the form provides it.
    ...(invNum != null && Number.isFinite(invNum) ? { inventory: Math.max(0, Math.trunc(invNum)) } : {}),
    isActive: String(value.isActive) === 'true',
  };
}

// PUBLIC_INTERFACE
function ProductForm({
  mode,
  initialProduct,
  productId,
  onSubmit,
  onCancel,
  submitLabel,
  notice,
}) {
  /**
   * Reusable product form for admin create/edit with client-side validation.
   *
   * @param {'create'|'edit'} mode
   * @param {any} [initialProduct]
   * @param {string} [productId] Used only for local fallback storage bucketing.
   * @param {(payload: any) => Promise<any>} onSubmit
   * @param {() => void} onCancel
   * @param {string} submitLabel
   * @param {{ tone: 'success'|'info'|'error', message: string } | null} notice
   */
  const [value, setValue] = useState(() => toFormValue(initialProduct));
  const [touched, setTouched] = useState({});
  const [submitState, setSubmitState] = useState('idle'); // idle | saving
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const titleRef = useRef(null);

  // When switching from loading -> loaded initial product, update fields.
  useEffect(() => {
    setValue(toFormValue(initialProduct));
    setTouched({});
    setFieldErrors({});
    setSubmitError('');
  }, [initialProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // focus first input on mount
    if (titleRef.current) titleRef.current.focus();
  }, []);

  const validation = useMemo(() => validate(value), [value]);

  const showError = (key) => Boolean((touched[key] || submitState === 'saving') && fieldErrors[key]);

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleChange = (key, next) => {
    setValue((prev) => ({ ...prev, [key]: next }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const { errors, isValid } = validate(value);
    setFieldErrors(errors);

    if (!isValid) {
      // mark all as touched so errors show
      setTouched({
        title: true,
        category: true,
        price: true,
        inventory: true,
        imageUrl: true,
      });
      return;
    }

    setSubmitState('saving');

    const payload = toApiPayload(value, mode === 'edit' ? { id: productId } : undefined);

    try {
      await onSubmit(payload);
    } catch (err) {
      setSubmitError(getFriendlyErrorMessage(err));
      setSubmitState('idle');
      return;
    }

    setSubmitState('idle');
  };

  const previewImageUrl = String(value.imageUrl || '').trim();

  // If backend unavailable, parent may still submit via local storage and show a notice.
  // This component doesn't decide that; it just shows provided notice.
  return (
    <section className="Card Card--padded" aria-label={mode === 'create' ? 'Create product form' : 'Edit product form'}>
      {notice ? (
        <div
          className="AdminNotice"
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 12,
            borderRadius: 12,
            border: '1px solid var(--border-color)',
            background:
              notice.tone === 'success'
                ? 'rgba(6, 182, 212, 0.12)'
                : notice.tone === 'error'
                  ? 'rgba(239, 68, 68, 0.10)'
                  : 'rgba(59, 130, 246, 0.08)',
            padding: '10px 12px',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {notice.message}
        </div>
      ) : null}

      {submitError ? (
        <p className="Muted" role="alert" style={{ marginTop: 0 }}>
          <span
            className="Pill"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.32)',
              background: 'rgba(239, 68, 68, 0.10)',
            }}
          >
            {submitError}
          </span>
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="FormGrid">
          <label className="Field">
            <span className="Field__label">
              Name <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
            </span>
            <input
              ref={titleRef}
              className={`Input ${showError('title') ? 'Input--error' : ''}`}
              value={value.title}
              onChange={(e) => handleChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Relaxed Fit Denim Jacket"
              aria-invalid={showError('title') ? 'true' : 'false'}
              aria-describedby={showError('title') ? 'field-error-title' : undefined}
              autoComplete="off"
            />
            {showError('title') ? (
              <span id="field-error-title" className="Field__error">
                {fieldErrors.title}
              </span>
            ) : null}
          </label>

          <label className="Field">
            <span className="Field__label">
              Category <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
            </span>
            <input
              className={`Input ${showError('category') ? 'Input--error' : ''}`}
              value={value.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              placeholder="Outerwear"
              aria-invalid={showError('category') ? 'true' : 'false'}
              aria-describedby={showError('category') ? 'field-error-category' : undefined}
              autoComplete="off"
            />
            {showError('category') ? (
              <span id="field-error-category" className="Field__error">
                {fieldErrors.category}
              </span>
            ) : null}
          </label>

          <label className="Field">
            <span className="Field__label">Brand</span>
            <input
              className="Input"
              value={value.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="Kavia Denim"
              autoComplete="off"
            />
          </label>

          <label className="Field">
            <span className="Field__label">
              Price <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
            </span>
            <input
              className={`Input ${showError('price') ? 'Input--error' : ''}`}
              value={value.price}
              onChange={(e) => handleChange('price', e.target.value)}
              onBlur={() => handleBlur('price')}
              placeholder="79.99"
              inputMode="decimal"
              aria-invalid={showError('price') ? 'true' : 'false'}
              aria-describedby={showError('price') ? 'field-error-price' : undefined}
              autoComplete="off"
            />
            {showError('price') ? (
              <span id="field-error-price" className="Field__error">
                {fieldErrors.price}
              </span>
            ) : (
              <span className="Field__hint">Must be numeric and ≥ 0.</span>
            )}
          </label>

          <label className="Field">
            <span className="Field__label">Currency</span>
            <select className="Input" value={value.currency} onChange={(e) => handleChange('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <span className="Field__hint">Default: USD (can be extended later).</span>
          </label>

          <label className="Field">
            <span className="Field__label">Inventory</span>
            <input
              className={`Input ${showError('inventory') ? 'Input--error' : ''}`}
              value={value.inventory}
              onChange={(e) => handleChange('inventory', e.target.value)}
              onBlur={() => handleBlur('inventory')}
              placeholder="12"
              inputMode="numeric"
              aria-invalid={showError('inventory') ? 'true' : 'false'}
              aria-describedby={showError('inventory') ? 'field-error-inventory' : undefined}
              autoComplete="off"
            />
            {showError('inventory') ? (
              <span id="field-error-inventory" className="Field__error">
                {fieldErrors.inventory}
              </span>
            ) : (
              <span className="Field__hint">Optional; must be a whole number ≥ 0.</span>
            )}
          </label>

          <label className="Field">
            <span className="Field__label">Status</span>
            <select className="Input" value={value.isActive} onChange={(e) => handleChange('isActive', e.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <label className="Field Field--full">
            <span className="Field__label">Image URL</span>
            <input
              className={`Input ${showError('imageUrl') ? 'Input--error' : ''}`}
              value={value.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              onBlur={() => handleBlur('imageUrl')}
              placeholder="https://cdn.example.com/products/prod_123/1.jpg"
              aria-invalid={showError('imageUrl') ? 'true' : 'false'}
              aria-describedby={showError('imageUrl') ? 'field-error-imageUrl' : 'field-hint-imageUrl'}
              autoComplete="off"
            />
            {showError('imageUrl') ? (
              <span id="field-error-imageUrl" className="Field__error">
                {fieldErrors.imageUrl}
              </span>
            ) : (
              <span id="field-hint-imageUrl" className="Field__hint">
                Optional; must be a valid http(s) URL if provided.
              </span>
            )}
          </label>

          {previewImageUrl ? (
            <div className="Field Field--full" aria-label="Image preview">
              <span className="Field__label">Preview</span>
              <div
                className="Card"
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(59, 130, 246, 0.06)',
                }}
              >
                <div style={{ aspectRatio: '4 / 2', position: 'relative' }}>
                  <img
                    src={previewImageUrl}
                    alt="Product preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('Card__media--fallback');
                    }}
                  />
                  <div className="ProductCard__imgFallback" aria-label="Preview unavailable" />
                </div>
              </div>
            </div>
          ) : null}

          <label className="Field Field--full">
            <span className="Field__label">Description</span>
            <textarea
              className="Input Input--textarea"
              value={value.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="A classic denim jacket with a relaxed fit."
            />
          </label>
        </div>

        <div className="InlineActions" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <div className="InlineActions" style={{ marginTop: 0 }}>
            <button className="btn btnPrimary" type="submit" disabled={submitState === 'saving'}>
              {submitState === 'saving' ? 'Saving…' : submitLabel}
            </button>
            <button className="btn btnGhost" type="button" onClick={onCancel} disabled={submitState === 'saving'}>
              Cancel
            </button>
          </div>

          <div className="Muted" style={{ margin: 0, fontSize: 12 }}>
            {validation.isValid ? 'Looks good.' : 'Please fix the highlighted fields.'}
          </div>
        </div>
      </form>
    </section>
  );
}

export default ProductForm;

// PUBLIC_INTERFACE
export function adminProductMockFallback() {
  /**
   * Helpers for admin create/edit mock fallback storage.
   * Exported for use by admin pages without coupling them to localStorage key details.
   */
  return {
    readLocalAdminProducts,
    writeLocalAdminProducts,
    createLocalProduct,
    upsertLocalProduct,
  };
}
