import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { EmptyState } from '../components/Feedback';
import Button from '../components/Button';
import styles from './CartPage.module.css';
import { useAuth } from '../state/AuthContext';

// PUBLIC_INTERFACE
export default function CartPage() {
  /** Cart view and quantity management. */
  const { items, subtotal, setQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Cart</h1>
            <p className="pageSub">Your cart is empty.</p>
          </div>
          <Link className="link" to="/">
            Continue shopping
          </Link>
        </div>

        <EmptyState
          title="No items yet"
          description="Add items from the shop to start checkout."
          action={
            <Link to="/">
              <Button>Browse products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Cart</h1>
          <p className="pageSub">Review your items before checkout.</p>
        </div>
        <div className="row">
          <Button variant="secondary" size="sm" onClick={clearCart}>
            Clear cart
          </Button>
          <Link className="link" to="/">
            Continue shopping
          </Link>
        </div>
      </div>

      <div className="twoCol">
        <div className={['surface', styles.list].join(' ')}>
          {items.map((it) => (
            <div key={it.key} className={styles.item}>
              <img className={styles.img} src={it.image} alt={it.name} />
              <div className={styles.info}>
                <div className={styles.titleRow}>
                  <div className={styles.name}>{it.name}</div>
                  <div className={styles.price}>${it.price * it.quantity}</div>
                </div>
                <div className={styles.meta}>
                  {it.size ? <span className="badge">Size {it.size}</span> : null}
                  <span className="badge">${it.price} each</span>
                </div>
                <div className={styles.controls}>
                  <label className={styles.qtyLabel}>
                    Qty
                    <input
                      className={styles.qty}
                      type="number"
                      min={1}
                      max={99}
                      value={it.quantity}
                      onChange={(e) => setQuantity(it.key, e.target.value)}
                    />
                  </label>
                  <Button variant="danger" size="sm" onClick={() => removeFromCart(it.key)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className={['surface', styles.summary].join(' ')}>
          <div className={styles.sumTitle}>Order summary</div>
          <div className={styles.row}>
            <span className={styles.k}>Subtotal</span>
            <span className={styles.v}>${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.k}>Shipping</span>
            <span className={styles.v}>Free</span>
          </div>
          <div className="divider" />
          <div className={styles.row}>
            <span className={styles.kStrong}>Total</span>
            <span className={styles.vStrong}>${subtotal.toFixed(2)}</span>
          </div>

          <Button
            variant="success"
            onClick={() => {
              if (!isAuthenticated) navigate('/login', { state: { from: '/checkout' } });
              else navigate('/checkout');
            }}
          >
            Checkout
          </Button>

          <div className={styles.note}>
            Secure checkout. In mock mode, the order is simulated locally.
          </div>
        </aside>
      </div>
    </div>
  );
}
