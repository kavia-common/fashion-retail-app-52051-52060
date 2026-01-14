import React from 'react';
import { useParams } from 'react-router-dom';

// PUBLIC_INTERFACE
function AdminProductEditPage() {
  /** Placeholder admin product edit page. */
  const { id } = useParams();

  return (
    <div className="Page">
      <header className="PageHeader">
        <h1 className="PageTitle">Edit Product</h1>
        <p className="PageSubtitle">
          Editing product <span className="Pill">#{id}</span> (placeholder)
        </p>
      </header>

      <section className="Card Card--padded">
        <div className="FormGrid">
          <label className="Field">
            <span className="Field__label">Title</span>
            <input className="Input" defaultValue={`Product #${id}`} />
          </label>
          <label className="Field">
            <span className="Field__label">Price</span>
            <input className="Input" defaultValue="79.99" />
          </label>
          <label className="Field Field--full">
            <span className="Field__label">Description</span>
            <textarea className="Input Input--textarea" defaultValue="Placeholder description." />
          </label>
        </div>

        <div className="InlineActions">
          <button className="btn btnPrimary" type="button">
            Save changes
          </button>
          <button className="btn btnDanger" type="button">
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminProductEditPage;
