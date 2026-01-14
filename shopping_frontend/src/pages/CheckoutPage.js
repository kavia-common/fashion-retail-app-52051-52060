import React from 'react';

// PUBLIC_INTERFACE
function CheckoutPage() {
  /** Placeholder checkout page. */
  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Checkout</h1>
        <p className="PageSubtitle">Shipping + payment form will live here (placeholder).</p>
      </header>

      <div className="TwoCol">
        <section className="Card Card--padded">
          <h2 className="SectionTitle">Customer</h2>
          <div className="FormGrid">
            <label className="Field">
              <span className="Field__label">Email</span>
              <input className="Input" placeholder="jane@example.com" />
            </label>
            <label className="Field">
              <span className="Field__label">Phone</span>
              <input className="Input" placeholder="+1 (555) 0100" />
            </label>
          </div>
        </section>

        <section className="Card Card--padded">
          <h2 className="SectionTitle">Order summary</h2>
          <p className="Muted">Subtotal, shipping, tax, and total will be shown here.</p>
          <button className="btn btnPrimary" type="button">
            Place order
          </button>
        </section>
      </div>
    </div>
  );
}

export default CheckoutPage;
