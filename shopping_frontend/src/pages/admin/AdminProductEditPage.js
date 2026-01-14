import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductForm, { adminProductMockFallback } from '../../components/admin/ProductForm';
import { get, put } from '../../lib/apiClient';
import { getMockProductById } from '../../lib/mockProducts';

function getFriendlyLoadError(err) {
  const message = String(err?.message || '').trim();
  if (err?.timeout) return 'Request timed out while loading the product.';
  if (err?.network) return 'Cannot reach the backend. Loaded a mock/local fallback.';
  if (message) return message;
  return 'Failed to load product.';
}

/**
 * Reads locally-saved admin mock products so the edit flow can work after a fallback create.
 * @param {string} id
 * @param {(keyId: string) => any[]} readLocalAdminProducts
 * @returns {any|undefined}
 */
function getLocalAdminProductById(id, readLocalAdminProducts) {
  const list = readLocalAdminProducts('default');
  const needle = String(id || '');
  return list.find((p) => String(p?.id) === needle);
}

// PUBLIC_INTERFACE
function AdminProductEditPage() {
  /** Admin edit product page with validation, API update, and graceful mock fallback. */
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [product, setProduct] = useState(null);
  const [notice, setNotice] = useState(null);

  const { readLocalAdminProducts, upsertLocalProduct } = useMemo(() => adminProductMockFallback(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      setNotice(null);

      const pid = String(id || '');

      try {
        // Contract: GET /products/{id} exists; admin may also have GET /admin/products/{id} later.
        // Use /products/{id} for now (compatible with existing read flows).
        const data = await get(`/products/${encodeURIComponent(pid)}`);
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
        return;
      } catch (err) {
        // Next fallback: local admin store (if created in mock mode).
        const local = getLocalAdminProductById(pid, readLocalAdminProducts);
        if (local) {
          if (!cancelled) {
            setProduct(local);
            setLoadError(getFriendlyLoadError(err));
            setLoading(false);
          }
          return;
        }

        // Next fallback: standard mock dataset by id.
        const mock = getMockProductById(pid);
        if (!cancelled) {
          setProduct(mock || null);
          setLoadError(getFriendlyLoadError(err));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, readLocalAdminProducts]);

  const handleCancel = () => navigate('/admin/products');

  const handleUpdate = async (payload) => {
    setNotice(null);

    const pid = String(id || '');

    try {
      // Contract: PUT /admin/products/{id}
      await put(`/admin/products/${encodeURIComponent(pid)}`, payload);
      setNotice({ tone: 'success', message: 'Product updated.' });
      window.setTimeout(() => navigate('/admin/products', { replace: true }), 550);
      return;
    } catch (err) {
      // Fallback: update local store so list/edit demos still work when backend is down.
      upsertLocalProduct('default', { ...payload, id: pid, updatedAt: new Date().toISOString() });
      setNotice({ tone: 'info', message: 'Backend unavailable — saved locally (mock mode).' });
      window.setTimeout(() => navigate('/admin/products', { replace: true }), 900);
    }
  };

  if (loading) {
    return (
      <div className="Page" aria-busy="true">
        <header className="PageHeader PageHeader--row">
          <div>
            <h1 className="PageTitle">Edit Product</h1>
            <p className="PageSubtitle">
              Loading product <span className="Pill">#{String(id || '')}</span>…
            </p>
          </div>
          <div className="InlineActions">
            <Link className="btn btnGhost" to="/admin/products">
              ← Back to products
            </Link>
          </div>
        </header>

        <section className="Card Card--padded">
          <p className="Muted" style={{ margin: 0 }}>
            Loading…
          </p>
        </section>
      </div>
    );
  }

  if (!product || !String(product?.id || id || '').trim()) {
    return (
      <div className="Page">
        <header className="PageHeader PageHeader--row">
          <div>
            <h1 className="PageTitle">Product not found</h1>
            <p className="PageSubtitle">
              We couldn’t load <span className="Pill">#{String(id || '')}</span>.
            </p>
          </div>
          <div className="InlineActions">
            <Link className="btn btnPrimary" to="/admin/products">
              Back to products
            </Link>
          </div>
        </header>

        <section className="Card Card--padded">
          <p className="Muted" style={{ margin: 0 }}>
            Try returning to the products list.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">Edit Product</h1>
          <p className="PageSubtitle">
            Editing <span className="Pill">#{String(id || '')}</span>
          </p>
        </div>

        <div className="InlineActions">
          <Link className="btn btnGhost" to="/admin/products">
            ← Back to products
          </Link>
        </div>
      </header>

      {loadError ? (
        <section className="Card Card--padded" role="status" aria-live="polite" style={{ marginBottom: 16 }}>
          <p className="Muted" style={{ margin: 0 }}>
            Note: {loadError}
          </p>
        </section>
      ) : null}

      <ProductForm
        mode="edit"
        initialProduct={product}
        productId={String(id || '')}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        submitLabel="Save changes"
        notice={notice}
      />
    </div>
  );
}

export default AdminProductEditPage;
