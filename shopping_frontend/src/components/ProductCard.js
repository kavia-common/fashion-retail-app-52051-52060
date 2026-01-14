import React from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import styles from './ProductCard.module.css';
import { useCart } from '../state/CartContext';

// PUBLIC_INTERFACE
export default function ProductCard({ product }) {
  /** Card for product listing with quick add-to-cart. */
  const { addToCart } = useCart();

  return (
    <div className={[styles.card, 'surface'].join(' ')}>
      <Link to={`/products/${encodeURIComponent(product.id)}`} className={styles.mediaLink}>
        <div className={styles.media}>
          <img className={styles.img} src={product.image} alt={product.name} loading="lazy" />
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.nameRow}>
            <Link className={styles.name} to={`/products/${encodeURIComponent(product.id)}`}>
              {product.name}
            </Link>
            <span className="badge">{product.category}</span>
          </div>
          <div className={styles.price}>
            ${product.price} <span className={styles.currency}>{product.currency || 'USD'}</span>
          </div>
        </div>

        <div className={styles.desc}>{product.description}</div>

        <div className={styles.actions}>
          <Link to={`/products/${encodeURIComponent(product.id)}`}>
            <Button variant="secondary" size="sm">
              View
            </Button>
          </Link>
          <Button
            size="sm"
            disabled={!product.inStock}
            onClick={() => addToCart(product, { quantity: 1 })}
          >
            {product.inStock ? 'Add to cart' : 'Out of stock'}
          </Button>
        </div>
      </div>
    </div>
  );
}
