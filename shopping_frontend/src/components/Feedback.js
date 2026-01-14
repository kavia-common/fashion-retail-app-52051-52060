import React from 'react';
import styles from './Feedback.module.css';

// PUBLIC_INTERFACE
export function Spinner({ label = 'Loading…' }) {
  /** Small loading indicator. */
  return (
    <div className={styles.spinnerWrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden />
      <span className={styles.spinnerLabel}>{label}</span>
    </div>
  );
}

// PUBLIC_INTERFACE
export function InlineError({ message }) {
  /** Minimal error alert. */
  if (!message) return null;
  return (
    <div className={styles.error} role="alert">
      {message}
    </div>
  );
}

// PUBLIC_INTERFACE
export function EmptyState({ title, description, action }) {
  /** Empty state card. */
  return (
    <div className={[styles.empty, 'surface'].join(' ')}>
      <div className={styles.emptyTitle}>{title}</div>
      {description ? <div className={styles.emptyDesc}>{description}</div> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}
