import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { post } from '../lib/apiClient';

/**
 * @param {unknown} amount
 * @param {string} currency
 * @returns {string}
 */
function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toFixed(2)}${currency ? ` ${currency}` : ''}`;
}

/**
 * Simple email format check (intentionally lightweight for MVP).
 * @param {string} value
 * @returns {boolean}
 */
function isEmailLike(value) {
  const v = String(value || '').trim();
  // "contains @" is the contract's minimal suggestion; add a tiny bit more to reduce obvious typos.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Generates a deterministic-enough order id for mock fallback.
 * @returns {string}
 */
function generateMockOrderId() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `order_mock_${ts}_${rnd}`;
}

/**
 * @param {any} err
 * @returns {string}
 */
function getFriendlyCheckoutError(err) {
  const message = String(err?.message || '').trim();
  if (err?.timeout) return 'Checkout timed out. Please try again.';
  if (err?.network)
    return 'Cannot reach the backend right now. You can still place a mock order to continue the demo.';
  if (message) return message;
  return 'Something went wrong while placing your order.';
}

/**
 * Best-effort mapping from current cart state to the checkout contract.
 * The contract expects cartId, but our MVP cart is localStorage-only; we send a synthetic id.
 * @param {import('../cart/CartContext').useCart extends (...args:any)=>infer R ? R : any} cart
 * @returns {string}
 */
function buildSyntheticCartId(cart) {
  const lineCount = cart?.lineCount ?? 0;
  const itemCount = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  // Keep stable enough for the session; backend can ignore or accept later when cart API is implemented.
  return `local_cart_${lineCount}_${itemCount}_${Math.round(Number(subtotal || 0) * 100)}`;
}

/**
 * @param {any} cart
 * @param {any} form
 * @param {string} currency
 * @param {{shipping: number, tax: number, total: number}} totals
 * @returns {any}
 */
function buildCheckoutPayload(cart, form, currency, totals) {
  return {
    cartId: buildSyntheticCartId(cart),
    customer: {
      email: String(form.email || '').trim(),
      firstName: String(form.firstName || '').trim(),
      lastName: String(form.lastName || '').trim(),
      phone: String(form.phone || '').trim(),
    },
    shippingAddress: {
      line1: String(form.line1 || '').trim(),
      line2: String(form.line2 || '').trim(),
      city: String(form.city || '').trim(),
      state: String(form.state || '').trim(),
      postalCode: String(form.postalCode || '').trim(),
      country: String(form.country || '').trim(),
    },
    paymentMethod: {
      // Contract: placeholder payment method.
      type: 'placeholder',
      provider: 'none',
      note: 'Payment is a stub in this MVP UI.',
    },

    // Extra fields (backend may ignore). Useful for debugging and for a future cart-backed backend.
    cartPreview: {
      items: (cart?.state?.items || []).map((it) => ({
        productId: it.productId,
        title: it.title,
        quantity: it.qty,
        unitPrice: it.price,
        currency: it.currency,
        variant: it.variant || undefined,
      })),
      currency,
      subtotal: Number(cart?.subtotal ?? 0),
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
    },
  };
}

// PUBLIC_INTERFACE
function CheckoutPage() {
  /** Checkout form (shipping + contact + payment stub) that submits to POST /checkout and navigates to /order-confirmation. */
  const navigate = useNavigate();
  const cart = useCart();

  const { state, lineCount, itemCount, subtotal, clearCart } = cart;

  const currency = useMemo(() => state.items[0]?.currency || 'USD', [state.items]);

  // MVP totals: keep shipping/tax simple and explicit.
  const shipping = useMemo(() => (lineCount > 0 ? 9.99 : 0), [lineCount]);
  const tax = useMemo(() => 0, []);
  const total = useMemo(() => Number(subtotal || 0) + Number(shipping || 0) + Number(tax || 0), [subtotal, shipping, tax]);

  const [form, setForm] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  /** @type {[Record<string,string>, Function]} */
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errorSummaryRef = useRef(null);

  const isEmpty = lineCount === 0;

  useEffect(() => {
    // If cart becomes empty, keep users from trying to submit.
    if (isEmpty) {
      setSubmitError('');
      setSubmitting(false);
    }
  }, [isEmpty]);

  /**
   * @param {keyof typeof form} key
   * @param {string} value
   */
  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear per-field error on change to reduce friction.
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    /** @type {Record<string,string>} */
    const next = {};

    const required = (k, label) => {
      if (!String(form[k] || '').trim()) next[k] = `${label} is required.`;
    };

    required('email', 'Email');
    if (form.email && !isEmailLike(form.email)) next.email = 'Please enter a valid email address.';

    // Contact (phone optional for MVP)
    required('firstName', 'First name');
    required('lastName', 'Last name');

    // Shipping address
    required('line1', 'Address line 1');
    required('city', 'City');
    required('postalCode', 'Postal code');
    required('country', 'Country');

    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (isEmpty) return;

    setSubmitError('');

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Move focus to error summary for accessibility.
      window.setTimeout(() => errorSummaryRef.current?.focus?.(), 0);
      return;
    }

    setSubmitting(true);

    const payload = buildCheckoutPayload(
      cart,
      form,
      currency,
      { shipping, tax, total }
    );

    try {
      const data = await post('/checkout', payload);

      // Contract: { orderId, summary: {...} }
      const orderId = String(data?.orderId || data?.summary?.orderId || '');
      const summary = data?.summary || null;

      if (!orderId) {
        throw new Error('Checkout succeeded but did not return an orderId.');
      }

      clearCart();
      navigate('/order-confirmation', {
        replace: true,
        state: {
          order: {
            orderId,
            summary: summary || {
              orderId,
              currency,
              subtotal: Number(subtotal || 0),
              shipping,
              tax,
              total,
              itemsCount: Number(itemCount || 0),
            },
            customerEmail: String(form.email || '').trim(),
            items: state.items,
          },
        },
      });
    } catch (err) {
      // Mock fallback (pattern consistent with catalog/product details: degrade gracefully).
      const friendly = getFriendlyCheckoutError(err);
      setSubmitError(friendly);

      // If backend is unreachable, allow completing the UX with a mock order.
      const allowMock = Boolean(err?.network);
      if (allowMock) {
        const mockOrderId = generateMockOrderId();
        clearCart();
        navigate('/order-confirmation', {
          replace: true,
          state: {
            order: {
              orderId: mockOrderId,
              summary: {
                orderId: mockOrderId,
                currency,
                subtotal: Number(subtotal || 0),
                shipping,
                tax,
                total,
                itemsCount: Number(itemCount || 0),
              },
              customerEmail: String(form.email || '').trim(),
              items: state.items,
              isMock: true,
              note: friendly,
            },
          },
        });
        return;
      }

      window.setTimeout(() => errorSummaryRef.current?.focus?.(), 0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Checkout</h1>
          <p className="PageSubtitle">Enter shipping and contact details. Payment is a stub for now.</p>
        </div>

        <div className="InlineActions" aria-label="Checkout header actions">
          <Link className="btn btnGhost" to="/cart">
            ← Back to cart
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <section className="Card Card--padded" role="status" aria-live="polite">
          <h2 className="SectionTitle">Your cart is empty</h2>
          <p className="Muted">Add items before checking out.</p>
          <div className="InlineActions">
            <Link className="btn btnPrimary" to="/catalog">
              Browse catalog
            </Link>
          </div>
        </section>
      ) : (
        <div className="TwoCol">
          <section className="Card Card--padded" aria-label="Checkout form">
            <h2 className="SectionTitle">Shipping & contact</h2>

            {submitError ? (
              <div
                className="Card Card--padded"
                style={{
                  marginTop: 12,
                  borderColor: 'rgba(239, 68, 68, 0.32)',
                  background: 'rgba(239, 68, 68, 0.10)',
                }}
                role="alert"
                tabIndex={-1}
                ref={errorSummaryRef}
                aria-label="Checkout error"
              >
                <p style={{ margin: 0 }}>
                  <strong>Could not place order.</strong> {submitError}
                </p>
                {submitError.toLowerCase().includes('mock') ? null : (
                  <p className="Muted" style={{ marginTop: 8, fontSize: 12 }}>
                    If you are running without a backend, try again when the backend is reachable.
                  </p>
                )}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
              <div className="FormGrid">
                <label className="Field">
                  <span className="Field__label">Email *</span>
                  <input
                    className="Input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    aria-invalid={errors.email ? 'true' : 'false'}
                  />
                  {errors.email ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.email}
                    </span>
                  ) : null}
                </label>

                <label className="Field">
                  <span className="Field__label">Phone</span>
                  <input
                    className="Input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 0100"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </label>

                <label className="Field">
                  <span className="Field__label">First name *</span>
                  <input
                    className="Input"
                    autoComplete="given-name"
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    aria-invalid={errors.firstName ? 'true' : 'false'}
                  />
                  {errors.firstName ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.firstName}
                    </span>
                  ) : null}
                </label>

                <label className="Field">
                  <span className="Field__label">Last name *</span>
                  <input
                    className="Input"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    aria-invalid={errors.lastName ? 'true' : 'false'}
                  />
                  {errors.lastName ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.lastName}
                    </span>
                  ) : null}
                </label>

                <label className="Field" style={{ gridColumn: '1 / -1' }}>
                  <span className="Field__label">Address line 1 *</span>
                  <input
                    className="Input"
                    autoComplete="address-line1"
                    placeholder="123 Market St"
                    value={form.line1}
                    onChange={(e) => updateField('line1', e.target.value)}
                    aria-invalid={errors.line1 ? 'true' : 'false'}
                  />
                  {errors.line1 ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.line1}
                    </span>
                  ) : null}
                </label>

                <label className="Field" style={{ gridColumn: '1 / -1' }}>
                  <span className="Field__label">Address line 2</span>
                  <input
                    className="Input"
                    autoComplete="address-line2"
                    placeholder="Apt 4B"
                    value={form.line2}
                    onChange={(e) => updateField('line2', e.target.value)}
                  />
                </label>

                <label className="Field">
                  <span className="Field__label">City *</span>
                  <input
                    className="Input"
                    autoComplete="address-level2"
                    placeholder="San Francisco"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    aria-invalid={errors.city ? 'true' : 'false'}
                  />
                  {errors.city ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.city}
                    </span>
                  ) : null}
                </label>

                <label className="Field">
                  <span className="Field__label">State</span>
                  <input
                    className="Input"
                    autoComplete="address-level1"
                    placeholder="CA"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  />
                </label>

                <label className="Field">
                  <span className="Field__label">Postal code *</span>
                  <input
                    className="Input"
                    autoComplete="postal-code"
                    placeholder="94105"
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    aria-invalid={errors.postalCode ? 'true' : 'false'}
                  />
                  {errors.postalCode ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.postalCode}
                    </span>
                  ) : null}
                </label>

                <label className="Field">
                  <span className="Field__label">Country *</span>
                  <input
                    className="Input"
                    autoComplete="country"
                    placeholder="US"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    aria-invalid={errors.country ? 'true' : 'false'}
                  />
                  {errors.country ? (
                    <span className="Muted" role="alert" style={{ fontSize: 12 }}>
                      {errors.country}
                    </span>
                  ) : null}
                </label>
              </div>

              <hr style={{ margin: '16px 0', opacity: 0.12 }} />

              <section aria-label="Payment method (stub)">
                <h3 className="SectionTitle" style={{ marginTop: 0 }}>
                  Payment (stub)
                </h3>
                <p className="Muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Payment is not implemented in this MVP. Submitting will place an order with a placeholder payment
                  method.
                </p>
              </section>

              <div className="InlineActions" style={{ marginTop: 16 }}>
                <button className="btn btnPrimary" type="submit" disabled={submitting} aria-disabled={submitting ? 'true' : 'false'}>
                  {submitting ? 'Placing order…' : 'Place order'}
                </button>
                <Link className="btn btnGhost" to="/catalog">
                  Continue shopping
                </Link>
              </div>
            </form>
          </section>

          <aside className="Card Card--padded" aria-label="Order summary">
            <h2 className="SectionTitle">Order summary</h2>

            <div className="Row" aria-label="Items summary row">
              <div>
                <div className="Row__title">Items</div>
                <div className="Row__meta">{itemCount} item{itemCount === 1 ? '' : 's'}</div>
              </div>
              <div className="Row__title">{formatMoney(subtotal, currency)}</div>
            </div>

            <div className="Row" aria-label="Shipping row">
              <div>
                <div className="Row__title">Shipping</div>
                <div className="Row__meta">Flat rate (MVP)</div>
              </div>
              <div className="Row__title">{formatMoney(shipping, currency)}</div>
            </div>

            <div className="Row" aria-label="Tax row">
              <div>
                <div className="Row__title">Tax</div>
                <div className="Row__meta">Calculated later</div>
              </div>
              <div className="Row__title">{formatMoney(tax, currency)}</div>
            </div>

            <hr style={{ margin: '12px 0', opacity: 0.12 }} />

            <div className="Row" aria-label="Total row">
              <div>
                <div className="Row__title">Total</div>
                <div className="Row__meta">Due now (stub)</div>
              </div>
              <div className="Row__title">{formatMoney(total, currency)}</div>
            </div>

            <p className="Muted" style={{ marginTop: 12, fontSize: 12 }}>
              By placing your order, you agree this is a demo checkout flow.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
