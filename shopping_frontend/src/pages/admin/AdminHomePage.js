import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
function AdminHomePage() {
  /** Placeholder admin dashboard home. */
  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Admin</h1>
        <p className="PageSubtitle">Admin dashboard placeholder.</p>
      </header>

      <section className="Card Card--padded">
        <h2 className="SectionTitle">Catalog management</h2>
        <p className="Muted">
          Admin authentication/authorization will be enforced by the backend. Use the products page to list and search
          catalog items.
        </p>
        <div className="InlineActions">
          <Link className="btn btnPrimary" to="/admin/products">
            View products
          </Link>
          <Link className="btn btnSecondary" to="/admin/products/new">
            New product
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AdminHomePage;
