import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Feedback';
import Button from '../components/Button';

// PUBLIC_INTERFACE
export default function NotFoundPage() {
  /** 404 route. */
  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Not found</h1>
          <p className="pageSub">This page doesn’t exist.</p>
        </div>
      </div>

      <EmptyState
        title="404"
        description="Try going back to the shop."
        action={
          <Link to="/">
            <Button>Go to shop</Button>
          </Link>
        }
      />
    </div>
  );
}
