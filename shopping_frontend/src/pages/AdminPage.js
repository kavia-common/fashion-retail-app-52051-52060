import React, { useEffect, useMemo, useState } from 'react';
import { adminCreateProduct, adminDeleteProduct, adminUpdateProduct, listProducts } from '../api/shopApi';
import { useAuth } from '../state/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { InlineError, Spinner } from '../components/Feedback';
import styles from './AdminPage.module.css';

// PUBLIC_INTERFACE
export default function AdminPage() {
  /** Admin product management screen. */
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    name: '',
    price: '',
    category: 'General',
    image: '',
    description: '',
    inStock: true,
    sizes: 'S,M,L',
  });

  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingId) || null,
    [products, editingId]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listProducts();
      setProducts(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetDraft = () =>
    setDraft({
      name: '',
      price: '',
      category: 'General',
      image: '',
      description: '',
      inStock: true,
      sizes: 'S,M,L',
    });

  const startEdit = (p) => {
    setEditingId(p.id);
    setDraft({
      name: p.name || '',
      price: String(p.price || ''),
      category: p.category || 'General',
      image: p.image || '',
      description: p.description || '',
      inStock: Boolean(p.inStock),
      sizes: Array.isArray(p.sizes) ? p.sizes.join(',') : 'S,M,L',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetDraft();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const product = {
      name: draft.name.trim(),
      price: Number(draft.price),
      category: draft.category.trim(),
      image: draft.image.trim(),
      description: draft.description.trim(),
      inStock: Boolean(draft.inStock),
      sizes: draft.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        const updated = await adminUpdateProduct({ productId: editingId, product, token });
        setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
        cancelEdit();
      } else {
        const created = await adminCreateProduct({ product, token });
        setProducts((ps) => [created, ...ps]);
        resetDraft();
      }
    } catch (err) {
      setError(err?.message || 'Save failed');
    }
  };

  const onDelete = async (productId) => {
    // keep it minimal (no modal); confirm is fine here
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Delete this product?');
    if (!ok) return;

    setError('');
    try {
      await adminDeleteProduct({ productId, token });
      setProducts((ps) => ps.filter((p) => p.id !== productId));
      if (editingId === productId) cancelEdit();
    } catch (err) {
      setError(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Admin</h1>
          <p className="pageSub">Signed in as {user?.email}</p>
        </div>
        <div className="row">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <Spinner label="Loading admin dashboard…" /> : null}
      <InlineError message={error} />

      <div className="twoCol">
        <div className={['surface', styles.panel].join(' ')}>
          <div className={styles.panelTitle}>{editingProduct ? 'Edit product' : 'Add product'}</div>

          <form className={styles.form} onSubmit={submit}>
            <Input
              label="Name"
              value={draft.name}
              onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
              placeholder="Product name"
            />
            <Input
              label="Price"
              value={draft.price}
              onChange={(e) => setDraft((s) => ({ ...s, price: e.target.value }))}
              placeholder="e.g. 49"
            />
            <Input
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))}
              placeholder="e.g. Outerwear"
            />
            <Input
              label="Image URL"
              value={draft.image}
              onChange={(e) => setDraft((s) => ({ ...s, image: e.target.value }))}
              placeholder="https://…"
              hint="Optional in mock mode; a default image will be used."
            />
            <div className={styles.textAreaField}>
              <label className={styles.taLabel} htmlFor="desc">
                Description
              </label>
              <textarea
                id="desc"
                className={styles.textArea}
                value={draft.description}
                onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
                placeholder="Short product description"
                rows={4}
              />
            </div>
            <Input
              label="Sizes (comma-separated)"
              value={draft.sizes}
              onChange={(e) => setDraft((s) => ({ ...s, sizes: e.target.value }))}
              placeholder="S,M,L"
            />

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.inStock}
                onChange={(e) => setDraft((s) => ({ ...s, inStock: e.target.checked }))}
              />
              In stock
            </label>

            <div className={styles.actions}>
              <Button variant="success" type="submit">
                {editingProduct ? 'Save changes' : 'Create product'}
              </Button>
              {editingProduct ? (
                <Button variant="secondary" type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              ) : (
                <Button variant="secondary" type="button" onClick={resetDraft}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className={['surface', styles.list].join(' ')}>
          <div className={styles.panelTitle}>Products</div>
          <div className={styles.table}>
            {products.map((p) => (
              <div key={p.id} className={styles.row}>
                <img className={styles.thumb} src={p.image} alt={p.name} />
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <div className={styles.pName}>{p.name}</div>
                    <div className={styles.pPrice}>${p.price}</div>
                  </div>
                  <div className={styles.rowMeta}>
                    <span className="badge">{p.category}</span>
                    <span className="badge">{p.inStock ? 'In stock' : 'Out of stock'}</span>
                    <span className="badge">{p.id}</span>
                  </div>
                  <div className={styles.rowBtns}>
                    <Button variant="secondary" size="sm" type="button" onClick={() => startEdit(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" type="button" onClick={() => onDelete(p.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && !loading ? (
            <div className={styles.empty}>No products to manage.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
