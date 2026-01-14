import React from 'react';
import styles from './Button.module.css';

// PUBLIC_INTERFACE
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  /** Reusable button component with variants. */
  const cls = [
    styles.btn,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    loading ? styles.loading : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? <span className={styles.loader} aria-hidden /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
