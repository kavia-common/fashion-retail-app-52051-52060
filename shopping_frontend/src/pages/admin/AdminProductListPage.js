import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
function AdminProductListPage() {
  /** Placeholder admin product listing page. */
  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Admin Products</h1>
          <p className="PageSubtitle">List/search products (placeholder).</p>
        </div>
        <div className="InlineActions">
          <Link className="btn btnPrimary" to="/admin/products/new">
            New product
          </Link>
        </div>
      </header>

      <section className="Card Card--padded">
        <div className="Grid Grid--list" aria-label="Admin product list placeholder">
          {Array.from({ length: 6 }).map((_, idx) => {
            const id = String(idx + 1);
            return (
              <div key={id} className="Row">
                <div className="Row__left">
                  <div className="Row__title">Product #{id}</div>
                  <div className="Row__meta">Updated just now • $XX.XX</div>
                </div>
                <div className="Row__right">
                  <Link className="btn btnGhost" to={`/admin/products/${id}`}>
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AdminProductListPage;
