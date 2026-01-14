import React from 'react';
import styles from './Input.module.css';

// PUBLIC_INTERFACE
export default function Input({ label, hint, error, id, ...props }) {
  /** Reusable input with label/hint/error display. */
  const inputId = id || `in_${Math.random().toString(16).slice(2)}`;
  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={[styles.input, error ? styles.inputError : ''].filter(Boolean).join(' ')}
        {...props}
      />
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error && hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
