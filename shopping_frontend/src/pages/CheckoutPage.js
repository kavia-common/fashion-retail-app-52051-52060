import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkout as apiCheckout } from '../api/shopApi';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { InlineError } from '../components/Feedback';
import styles from './CheckoutPage.module.css';

// PUBLIC_INTERFACE
export default function CheckoutPage() {
  /** Checkout flow (shipping details + place order). */
  const { items, subtotal, clearCart } = useCart();
  const { token } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    country: 'US',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const canSubmit = useMemo(() => items.length > 0 && !submitting, [items.length, submitting]);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const placeOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiCheckout({
        cartItems: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
        shipping: form,
        token,
      });
      setDone(res);
      clearCart();
    } catch (err) {
      setError(err?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Order confirmed</h1>
            <p className="pageSub">
              Order <strong>{done.orderId}</strong> • Delivery in ~{done.estimatedDeliveryDays} days
            </p>
          </div>
          <Link className="link" to="/">
            Back to shop
          </Link>
        </div>

        <div className={['surface', styles.confirm].join(' ')}>
          <div className={styles.big}>Thanks for your purchase.</div>
          <div className="mutedText">
            We’ve sent a confirmation email (simulated in mock mode).
          </div>
          <div className={styles.actions}>
            <Link to="/">
              <Button>Continue shopping</Button>
            </Link>
            <Link to="/cart">
              <Button variant="secondary">View cart</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Checkout</h1>
          <p className="pageSub">Enter shipping details to place your order.</p>
        </div>
        <Link className="link" to="/cart">
          Back to cart
        </Link>
      </div>

      <div className="twoCol">
        <form className={['surface', styles.form].join(' ')} onSubmit={placeOrder}>
          <InlineError message={error} />
          <div className={styles.formGrid}>
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Jane Doe"
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="jane@example.com"
              type="email"
            />
            <Input
              label="Address line 1"
              value={form.address1}
              onChange={(e) => update('address1', e.target.value)}
              placeholder="123 Main St"
            />
            <Input
              label="Address line 2"
              value={form.address2}
              onChange={(e) => update('address2', e.target.value)}
              placeholder="Apt, suite, etc. (optional)"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="San Francisco"
            />
            <Input
              label="Postal code"
              value={form.postalCode}
              onChange={(e) => update('postalCode', e.target.value)}
              placeholder="94103"
            />
          </div>

          <div className={styles.ctaRow}>
            <Button variant="success" loading={submitting} disabled={!canSubmit} type="submit">
              Place order
            </Button>
            <span className="mutedText">Total: ${subtotal.toFixed(2)}</span>
          </div>
        </form>

        <aside className={['surface', styles.summary].join(' ')}>
          <div className={styles.sumTitle}>Items ({items.length})</div>
          <div className={styles.items}>
            {items.map((it) => (
              <div key={it.key} className={styles.item}>
                <div className={styles.itemName}>
                  {it.name} {it.size ? <span className="badge">Size {it.size}</span> : null}
                </div>
                <div className={styles.itemPrice}>${(it.price * it.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className={styles.totalRow}>
            <span className={styles.kStrong}>Total</span>
            <span className={styles.vStrong}>${subtotal.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
