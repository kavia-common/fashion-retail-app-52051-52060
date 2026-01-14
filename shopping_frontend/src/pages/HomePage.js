import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

// PUBLIC_INTERFACE
function HomePage() {
  /** Placeholder product listing page. */
  const query = useQuery();
  const q = query.get('q');

  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Products</h1>
        <p className="PageSubtitle">
          {q ? (
            <>
              Showing results for <span className="Pill">“{q}”</span>
            </>
          ) : (
            'Browse our catalog (placeholder).'
          )}
        </p>
      </header>

      <section className="Grid" aria-label="Product grid placeholder">
        {Array.from({ length: 8 }).map((_, idx) => {
          const id = String(idx + 1);
          return (
            <article key={id} className="Card">
              <div className="Card__media" aria-hidden="true" />
              <div className="Card__body">
                <h2 className="Card__title">Product #{id}</h2>
                <p className="Card__meta">$XX.XX</p>
                <div className="Card__actions">
                  <Link className="btn btnPrimary" to={`/product/${id}`}>
                    View
                  </Link>
                  <button className="btn btnSecondary" type="button">
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default HomePage;
