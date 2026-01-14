import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
function CartPage() {
  /** Placeholder cart page. */
  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Cart</h1>
        <p className="PageSubtitle">Your selected items will appear here (placeholder).</p>
      </header>

      <section className="Card Card--padded">
        <p className="Muted">Cart items: <strong>0</strong></p>
        <div className="InlineActions">
          <Link className="btn btnPrimary" to="/checkout">
            Continue to checkout
          </Link>
          <Link className="btn btnGhost" to="/">
            Keep shopping
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CartPage;
