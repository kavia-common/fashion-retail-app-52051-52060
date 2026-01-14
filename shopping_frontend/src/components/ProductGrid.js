import React from 'react';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';

// PUBLIC_INTERFACE
export default function ProductGrid({ products }) {
  /** Responsive product grid. */
  return (
    <div className={styles.grid} role="list">
      {products.map((p) => (
        <div key={p.id} role="listitem">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
