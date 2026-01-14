import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../cart/CartContext';

function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toFixed(2)}${currency ? ` ${currency}` : ''}`;
}

/**
 * @param {{variant?: {variantId?: string, size?: string, color?: string}}} item
 * @returns {string}
 */
function formatVariantLabel(item) {
  const v = item?.variant || {};
  const parts = [];
  if (v.color) parts.push(String(v.color));
  if (v.size) parts.push(String(v.size));
  if (parts.length) return parts.join(' / ');
  if (v.variantId) return `Variant ${String(v.variantId)}`;
  return 'Standard';
}

// PUBLIC_INTERFACE
function CartPage() {
  /** Cart page: view items, update quantities, remove items, see totals, proceed to checkout. */
  const navigate = useNavigate();
  const { state, subtotal, itemCount, lineCount, setQty, removeItem, clearCart } = useCart();

  const currency = useMemo(() => {
    // MVP assumption: cart uses a single currency (or we display item currency per line).
    // We pick the first item's currency for subtotal display.
    return state.items[0]?.currency || 'USD';
  }, [state.items]);

  const isEmpty = lineCount === 0;

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Cart</h1>
          <p className="PageSubtitle">
            {isEmpty ? 'Your cart is empty.' : `You have ${itemCount} item${itemCount === 1 ? '' : 's'} in your cart.`}
          </p>
        </div>

        <div className="InlineActions" aria-label="Cart header actions">
          <Link className="btn btnGhost" to="/catalog">
            Keep shopping
          </Link>
          <button
            type="button"
            className="btn btnDanger"
            onClick={() => clearCart()}
            disabled={isEmpty}
            aria-disabled={isEmpty ? 'true' : 'false'}
          >
            Clear cart
          </button>
        </div>
      </header>

      {isEmpty ? (
        <section className="Card Card--padded" role="status" aria-live="polite">
          <h2 className="SectionTitle">Nothing here yet</h2>
          <p className="Muted">Add a product from the catalog or from a product details page.</p>
          <div className="InlineActions">
            <Link className="btn btnPrimary" to="/catalog">
              Browse catalog
            </Link>
          </div>
        </section>
      ) : (
        <div className="CartLayout" aria-label="Cart contents">
          <section className="Card CartItems" aria-label="Cart items list">
            <div className="CartItems__header">
              <h2 className="SectionTitle" style={{ margin: 0 }}>
                Items
              </h2>
              <span className="Muted" style={{ margin: 0 }}>
                {lineCount} line{lineCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="CartItems__list" role="list">
              {state.items.map((it) => {
                const lineTotal = (Number(it.price ?? 0) || 0) * (Number(it.qty ?? 0) || 0);

                return (
                  <article key={it.key} className="CartItem" role="listitem">
                    <div className="CartItem__media" aria-hidden="true">
                      {it.image ? (
                        <img
                          className="CartItem__img"
                          src={it.image}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.closest('.CartItem__media')?.classList.add('CartItem__media--fallback');
                          }}
                        />
                      ) : (
                        <div className="CartItem__imgFallback" />
                      )}
                    </div>

                    <div className="CartItem__body">
                      <div className="CartItem__topRow">
                        <div>
                          <div className="CartItem__title">{it.title}</div>
                          <div className="CartItem__meta">
                            <span className="Pill">{formatVariantLabel(it)}</span>
                            <span className="CartMetaDot"> • </span>
                            <span className="Muted" style={{ margin: 0 }}>
                              {formatMoney(it.price, it.currency)}
                            </span>
                          </div>
                        </div>

                        <button type="button" className="btn btnGhost" onClick={() => removeItem(it.key)}>
                          Remove
                        </button>
                      </div>

                      <div className="CartItem__bottomRow" aria-label="Quantity controls and line total">
                        <div className="Qty" aria-label={`Quantity for ${it.title}`}>
                          <button
                            type="button"
                            className="btn btnSecondary Qty__btn"
                            onClick={() => setQty(it.key, Math.max(0, Number(it.qty ?? 0) - 1))}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <input
                            className="Input Qty__input"
                            inputMode="numeric"
                            aria-label="Quantity"
                            value={String(it.qty)}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isFinite(next)) return;
                              setQty(it.key, next);
                            }}
                          />
                          <button
                            type="button"
                            className="btn btnSecondary Qty__btn"
                            onClick={() => setQty(it.key, Number(it.qty ?? 0) + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="CartItem__total" aria-label="Line total">
                          {formatMoney(lineTotal, it.currency)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="Card Card--padded CartSummary" aria-label="Order summary">
            <h2 className="SectionTitle">Summary</h2>

            <div className="Row" aria-label="Subtotal row">
              <div>
                <div className="Row__title">Subtotal</div>
                <div className="Row__meta">{itemCount} item{itemCount === 1 ? '' : 's'}</div>
              </div>
              <div className="Row__title">{formatMoney(subtotal, currency)}</div>
            </div>

            <p className="Muted" style={{ marginTop: 12, fontSize: 12 }}>
              Taxes, shipping, and discounts are calculated at checkout (MVP).
            </p>

            <div className="InlineActions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btnPrimary"
                onClick={() => navigate('/checkout')}
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
              </button>
              <Link className="btn btnGhost" to="/catalog">
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default CartPage;
