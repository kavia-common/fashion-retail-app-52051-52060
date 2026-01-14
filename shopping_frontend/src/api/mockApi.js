const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const seedProducts = [
  {
    id: 'p_001',
    name: 'Everyday Cotton Tee',
    price: 24,
    currency: 'USD',
    image:
      'https://images.unsplash.com/photo-1520975958225-5e2f8d0f5c3d?auto=format&fit=crop&w=1200&q=80',
    category: 'Tops',
    description:
      'Soft cotton tee with a relaxed fit. Designed for daily wear with a clean, minimal silhouette.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    inStock: true,
  },
  {
    id: 'p_002',
    name: 'Tailored Straight Jeans',
    price: 78,
    currency: 'USD',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    category: 'Denim',
    description:
      'Straight-leg denim with subtle stretch. Clean lines, comfortable feel, timeless look.',
    sizes: ['28', '30', '32', '34', '36'],
    inStock: true,
  },
  {
    id: 'p_003',
    name: 'Lightweight Overshirt',
    price: 64,
    currency: 'USD',
    image:
      'https://images.unsplash.com/photo-1520975693415-35a5c495b7aa?auto=format&fit=crop&w=1200&q=80',
    category: 'Outerwear',
    description:
      'A versatile overshirt with a structured drape. Layer it over tees and knits all season.',
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: false,
  },
  {
    id: 'p_004',
    name: 'Minimal Running Jacket',
    price: 92,
    currency: 'USD',
    image:
      'https://images.unsplash.com/photo-1520975867597-0f66f0f7b03d?auto=format&fit=crop&w=1200&q=80',
    category: 'Active',
    description:
      'Water-resistant jacket with breathable panels. Clean lines and reflective accents.',
    sizes: ['S', 'M', 'L'],
    inStock: true,
  },
  {
    id: 'p_005',
    name: 'Everyday Sneakers',
    price: 89,
    currency: 'USD',
    image:
      'https://images.unsplash.com/photo-1528701800489-20be9c9a66c3?auto=format&fit=crop&w=1200&q=80',
    category: 'Shoes',
    description:
      'Cushioned everyday sneaker with a streamlined profile. Easy to style, easy to wear.',
    sizes: ['7', '8', '9', '10', '11', '12'],
    inStock: true,
  },
];

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

function getDb() {
  const db = load('__mock_db__', null);
  if (db) return db;

  const initial = {
    products: seedProducts,
  };
  save('__mock_db__', initial);
  return initial;
}

function setDb(db) {
  save('__mock_db__', db);
}

// PUBLIC_INTERFACE
export async function mockListProducts({ q } = {}) {
  /** Return products (optionally filtered by query). */
  await delay(300);
  const { products } = getDb();
  const query = (q || '').trim().toLowerCase();
  if (!query) return products;

  return products.filter((p) => {
    return (
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  });
}

// PUBLIC_INTERFACE
export async function mockGetProduct(productId) {
  /** Return a single product by id. */
  await delay(220);
  const { products } = getDb();
  const p = products.find((x) => x.id === productId);
  if (!p) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  return p;
}

// PUBLIC_INTERFACE
export async function mockLogin({ email, password }) {
  /**
   * Mock login:
   * - admin@shop.test with any password -> admin
   * - everything else -> customer
   */
  await delay(350);
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const isAdmin = email.toLowerCase() === 'admin@shop.test';
  return {
    token: `mock_token_${Date.now()}`,
    user: {
      id: isAdmin ? 'u_admin' : 'u_customer',
      name: isAdmin ? 'Admin' : 'Customer',
      email,
      role: isAdmin ? 'admin' : 'customer',
    },
  };
}

// PUBLIC_INTERFACE
export async function mockCheckout({ cartItems, shipping }) {
  /** Simulate checkout and return order confirmation. */
  await delay(600);
  if (!cartItems || cartItems.length === 0) {
    const err = new Error('Your cart is empty');
    err.status = 400;
    throw err;
  }
  if (!shipping?.fullName || !shipping?.address1 || !shipping?.city) {
    const err = new Error('Please fill in shipping details');
    err.status = 400;
    throw err;
  }
  return {
    orderId: `order_${Math.random().toString(16).slice(2)}`,
    status: 'confirmed',
    estimatedDeliveryDays: 4,
  };
}

// PUBLIC_INTERFACE
export async function mockAdminCreateProduct(productInput) {
  /** Admin: create product. */
  await delay(400);
  const db = getDb();

  const name = (productInput?.name || '').trim();
  const price = Number(productInput?.price);
  if (!name || Number.isNaN(price) || price <= 0) {
    const err = new Error('Name and valid price are required');
    err.status = 400;
    throw err;
  }

  const newProduct = {
    id: `p_${Math.random().toString(16).slice(2)}`,
    name,
    price,
    currency: 'USD',
    image:
      productInput?.image ||
      'https://images.unsplash.com/photo-1520975661599-04a25b4a64f7?auto=format&fit=crop&w=1200&q=80',
    category: (productInput?.category || 'General').trim(),
    description: (productInput?.description || '').trim(),
    sizes: Array.isArray(productInput?.sizes) ? productInput.sizes : ['S', 'M', 'L'],
    inStock: productInput?.inStock ?? true,
  };

  db.products = [newProduct, ...db.products];
  setDb(db);
  return newProduct;
}

// PUBLIC_INTERFACE
export async function mockAdminUpdateProduct(productId, productInput) {
  /** Admin: update product by id. */
  await delay(400);
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === productId);
  if (idx === -1) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  db.products[idx] = {
    ...db.products[idx],
    ...productInput,
    price:
      productInput?.price === undefined ? db.products[idx].price : Number(productInput.price || 0),
  };
  setDb(db);
  return db.products[idx];
}

// PUBLIC_INTERFACE
export async function mockAdminDeleteProduct(productId) {
  /** Admin: delete product by id. */
  await delay(320);
  const db = getDb();
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== productId);
  if (db.products.length === before) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  setDb(db);
  return { ok: true };
}
