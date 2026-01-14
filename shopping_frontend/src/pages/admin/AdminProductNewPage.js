import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductForm, { adminProductMockFallback } from '../../components/admin/ProductForm';
import { post } from '../../lib/apiClient';

// PUBLIC_INTERFACE
function AdminProductNewPage() {
  /** Admin create product page with validation, API create, and graceful mock fallback. */
  const navigate = useNavigate();

  const [notice, setNotice] = useState(null);

  const { createLocalProduct } = useMemo(() => adminProductMockFallback(), []);

  const handleCancel = () => navigate('/admin/products');

  const handleCreate = async (payload) => {
    setNotice(null);

    try {
      // Contract: POST /admin/products
      await post('/admin/products', payload);
      setNotice({ tone: 'success', message: 'Product created.' });

      // Lightweight success notice; then navigate back.
      window.setTimeout(() => navigate('/admin/products', { replace: true }), 550);
      return;
    } catch (err) {
      // Fallback: store locally (mock mode) and still allow admin flow demo.
      createLocalProduct('default', payload);
      setNotice({
        tone: 'info',
        message: 'Backend unavailable — saved locally (mock mode).',
      });
      window.setTimeout(() => navigate('/admin/products', { replace: true }), 900);
      return;
    }
  };

  return (
    <div className="Page">
      <header className="PageHeader PageHeader--row">
        <div>
          <h1 className="PageTitle">New Product</h1>
          <p className="PageSubtitle">Create a new catalog item.</p>
        </div>

        <div className="InlineActions">
          <Link className="btn btnGhost" to="/admin/products">
            ← Back to products
          </Link>
        </div>
      </header>

      <ProductForm
        mode="create"
        initialProduct={{
          title: '',
          category: '',
          brand: '',
          description: '',
          price: '',
          currency: 'USD',
          inventory: '',
          images: [],
          isActive: true,
        }}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        submitLabel="Create product"
        notice={notice}
      />
    </div>
  );
}

export default AdminProductNewPage;
