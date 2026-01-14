import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../cart/CartContext';

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

// PUBLIC_INTERFACE
function OrderConfirmationPage() {
  /** Displays basic order confirmation details after checkout. Expects navigation state from CheckoutPage. */
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useCart();

  const order = /** @type {any} */ (location.state)?.order || null;

  const summary = order?.summary || null;

  const currency = useMemo(() => {
    return String(summary?.currency || order?.currency || 'USD');
  }, [order?.currency, summary?.currency]);

  // Defensive: ensure cart is cleared after checkout even if user reaches this route in odd ways.
  useEffect(() => {
    if (cart?.lineCount > 0 && order?.orderId) {
      cart.clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId]);

  if (!order || !order.orderId) {
    return (
      <div className="Page">
        <header className="PageHeader">
          <h1 className="PageTitle">Order confirmation</h1>
          <p className="PageSubtitle">We couldn't find an order to display.</p>
        </header>

        <section className="Card Card--padded" role="status" aria-live="polite">
          <p className="Muted" style={{ marginTop: 0 }}>
            This page expects an order from the checkout flow. If you refreshed the page, the details may be lost.
          </p>
          <div className="InlineActions">
            <button className="btn btnPrimary" type="button" onClick={() => navigate('/catalog', { replace: true })}>
              Back to catalog
            </button>
            <Link className="btn btnGhost" to="/cart">
              View cart
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Thank you!</h1>
        <p className="PageSubtitle">Your order has been placed successfully.</p>
      </header>

      {order?.isMock ? (
        <section className="Card Card--padded" role="status" aria-live="polite">
          <p className="Muted" style={{ margin: 0 }}>
            Backend was unavailable, so this is a <span className="Pill">mock order</span> for demo purposes.
          </p>
          {order?.note ? (
            <p className="Muted" style={{ marginTop: 8, fontSize: 12 }}>
              Note: {String(order.note)}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="TwoCol" style={{ marginTop: 14 }}>
        <section className="Card Card--padded" aria-label="Order details">
          <h2 className="SectionTitle">Order details</h2>

          <div className="Row" aria-label="Order id row">
            <div>
              <div className="Row__title">Order ID</div>
              <div className="Row__meta">Keep this for reference</div>
            </div>
            <div className="Row__title">
              <span className="Pill">{String(order.orderId)}</span>
            </div>
          </div>

          {order?.customerEmail ? (
            <div className="Row" aria-label="Contact row">
              <div>
                <div className="Row__title">Contact</div>
                <div className="Row__meta">Email</div>
              </div>
              <div className="Row__title">{String(order.customerEmail)}</div>
            </div>
          ) : null}

          <hr style={{ margin: '12px 0', opacity: 0.12 }} />

          <h3 className="SectionTitle" style={{ marginTop: 0 }}>
            Items
          </h3>

          <div role="list" aria-label="Ordered items list">
            {(order?.items || []).map((it) => {
              const lineTotal = (Number(it.price ?? 0) || 0) * (Number(it.qty ?? 0) || 0);
              return (
                <div key={it.key} className="Row" role="listitem" aria-label={`Ordered item ${it.title}`}>
                  <div>
                    <div className="Row__title">{String(it.title || 'Item')}</div>
                    <div className="Row__meta">
                      Qty {Number(it.qty ?? 0)} • {formatMoney(it.price, it.currency || currency)}
                    </div>
                  </div>
                  <div className="Row__title">{formatMoney(lineTotal, it.currency || currency)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="Card Card--padded" aria-label="Order summary">
          <h2 className="SectionTitle">Summary</h2>

          <div className="Row" aria-label="Subtotal row">
            <div className="Row__title">Subtotal</div>
            <div className="Row__title">{formatMoney(summary?.subtotal ?? 0, currency)}</div>
          </div>

          <div className="Row" aria-label="Shipping row">
            <div className="Row__title">Shipping</div>
            <div className="Row__title">{formatMoney(summary?.shipping ?? 0, currency)}</div>
          </div>

          <div className="Row" aria-label="Tax row">
            <div className="Row__title">Tax</div>
            <div className="Row__title">{formatMoney(summary?.tax ?? 0, currency)}</div>
          </div>

          <hr style={{ margin: '12px 0', opacity: 0.12 }} />

          <div className="Row" aria-label="Total row">
            <div className="Row__title">Total</div>
            <div className="Row__title">{formatMoney(summary?.total ?? 0, currency)}</div>
          </div>

          <p className="Muted" style={{ marginTop: 12, fontSize: 12 }}>
            Payment is a stub in this MVP UI. A real integration will replace placeholder paymentMethod.
          </p>

          <div className="InlineActions" style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" to="/catalog">
              Continue shopping
            </Link>
            <Link className="btn btnGhost" to="/cart">
              View cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;
