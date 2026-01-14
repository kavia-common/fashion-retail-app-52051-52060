import React from 'react';
import { Link, useParams } from 'react-router-dom';

// PUBLIC_INTERFACE
function ProductDetailsPage() {
  /** Placeholder product details page. */
  const { id } = useParams();

  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Product Details</h1>
        <p className="PageSubtitle">
          Placeholder for product <span className="Pill">#{id}</span>
        </p>
      </header>

      <div className="TwoCol">
        <section className="Card Card--padded">
          <h2 className="SectionTitle">Gallery</h2>
          <div className="ProductHero" aria-hidden="true" />
        </section>

        <section className="Card Card--padded">
          <h2 className="SectionTitle">Info</h2>
          <p className="Muted">
            This page will show images, price, description, variants, inventory, and an add-to-cart CTA.
          </p>

          <div className="InlineActions">
            <button className="btn btnPrimary" type="button">
              Add to cart
            </button>
            <Link className="btn btnGhost" to="/cart">
              Go to cart
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProductDetailsPage;
