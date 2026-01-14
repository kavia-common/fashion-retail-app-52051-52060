import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../api/shopApi';
import { InlineError, Spinner } from '../components/Feedback';
import Button from '../components/Button';
import styles from './ProductDetailPage.module.css';
import { useCart } from '../state/CartContext';

// PUBLIC_INTERFACE
export default function ProductDetailPage() {
  /** Product detail view. */
  const { id } = useParams();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);

  const sizes = useMemo(() => product?.sizes || [], [product]);
  const [size, setSize] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const p = await getProduct(id);
        if (!mounted) return;
        setProduct(p);
        setSize((p?.sizes && p.sizes[0]) || '');
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <Spinner label="Loading product…" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Product</h1>
            <p className="pageSub">We couldn’t load this product.</p>
          </div>
          <Link className="link" to="/">
            Back to shop
          </Link>
        </div>
        <InlineError message={error || 'Product not found'} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">{product.name}</h1>
          <p className="pageSub">{product.category}</p>
        </div>
        <Link className="link" to="/">
          Back to shop
        </Link>
      </div>

      <div className={['twoCol', styles.wrap].join(' ')}>
        <div className={['surface', styles.media].join(' ')}>
          <img className={styles.img} src={product.image} alt={product.name} />
        </div>

        <div className={['surface', styles.panel].join(' ')}>
          <div className={styles.priceRow}>
            <div className={styles.price}>${product.price}</div>
            <span className="badge">{product.inStock ? 'In stock' : 'Out of stock'}</span>
          </div>

          <div className={styles.desc}>{product.description}</div>

          {sizes.length > 0 ? (
            <div className={styles.sizes}>
              <div className={styles.label}>Size</div>
              <div className={styles.sizeGrid}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={[styles.sizeBtn, size === s ? styles.sizeActive : ''].join(' ')}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button
              disabled={!product.inStock}
              onClick={() => addToCart(product, { quantity: 1, size: size || undefined })}
            >
              Add to cart
            </Button>
            <Link to="/cart">
              <Button variant="secondary">View cart</Button>
            </Link>
          </div>

          <div className="divider" />

          <div className={styles.meta}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>SKU</span>
              <span className={styles.metaVal}>{product.id}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Shipping</span>
              <span className={styles.metaVal}>2–4 business days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
