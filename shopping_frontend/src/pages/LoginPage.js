import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { InlineError } from '../components/Feedback';
import styles from './LoginPage.module.css';

// PUBLIC_INTERFACE
export default function LoginPage() {
  /** Login screen. */
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Sign in</h1>
          <p className="pageSub">
            Use <strong>admin@shop.test</strong> (any password) for admin in MOCK_API mode.
          </p>
        </div>
        <Link className="link" to="/">
          Back to shop
        </Link>
      </div>

      <div className={['surface', styles.card].join(' ')}>
        <form className={styles.form} onSubmit={onSubmit}>
          <InlineError message={error} />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            placeholder="••••••••"
          />
          <Button loading={loading} type="submit">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
