import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listProducts } from '../api/shopApi';
import ProductGrid from '../components/ProductGrid';
import { EmptyState, InlineError, Spinner } from '../components/Feedback';

import Button from '../components/Button';

// PUBLIC_INTERFACE
export default function HomePage() {
  /** Product browse + search page. */
  const [params] = useSearchParams();
  const q = useMemo(() => params.get('q') || '', [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listProducts({ q });
      setProducts(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Shop</h1>
          <p className="pageSub">
            {q ? (
              <>
                Showing results for <strong>{q}</strong>
              </>
            ) : (
              'Browse new arrivals and essentials.'
            )}
          </p>
        </div>
        <div className="row">
          <span className="badge">{products.length} items</span>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <Spinner label="Loading products…" /> : null}
      <InlineError message={error} />

      {!loading && !error && products.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search." />
      ) : null}

      {!loading && !error && products.length > 0 ? <ProductGrid products={products} /> : null}
    </div>
  );
}
