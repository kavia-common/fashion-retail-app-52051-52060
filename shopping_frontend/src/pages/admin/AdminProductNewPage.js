import React from 'react';

// PUBLIC_INTERFACE
function AdminProductNewPage() {
  /** Placeholder admin product create page. */
  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">New Product</h1>
        <p className="PageSubtitle">Create product form (placeholder).</p>
      </header>

      <section className="Card Card--padded">
        <div className="FormGrid">
          <label className="Field">
            <span className="Field__label">Title</span>
            <input className="Input" placeholder="Relaxed Fit Denim Jacket" />
          </label>
          <label className="Field">
            <span className="Field__label">Price</span>
            <input className="Input" placeholder="79.99" />
          </label>
          <label className="Field Field--full">
            <span className="Field__label">Description</span>
            <textarea className="Input Input--textarea" placeholder="A classic denim jacket with a relaxed fit." />
          </label>
        </div>

        <div className="InlineActions">
          <button className="btn btnPrimary" type="button">
            Save
          </button>
          <button className="btn btnGhost" type="button">
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminProductNewPage;
