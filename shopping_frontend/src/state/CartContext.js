import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

function loadCart() {
  try {
    const raw = localStorage.getItem('__cart__');
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed?.items) return { items: [] };
    return parsed;
  } catch (e) {
    return { items: [] };
  }
}

function saveCart(state) {
  try {
    localStorage.setItem('__cart__', JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { product, quantity = 1, size } = action.payload;
      const key = `${product.id}::${size || ''}`;
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            key,
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: size || null,
            quantity: Math.max(1, Math.min(99, quantity)),
          },
        ],
      };
    }
    case 'REMOVE': {
      const { key } = action.payload;
      return { ...state, items: state.items.filter((i) => i.key !== key) };
    }
    case 'SET_QTY': {
      const { key, quantity } = action.payload;
      const q = Math.max(1, Math.min(99, Number(quantity) || 1));
      return { ...state, items: state.items.map((i) => (i.key === key ? { ...i, quantity: q } : i)) };
    }
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
}

const CartContext = createContext(null);

// PUBLIC_INTERFACE
export function CartProvider({ children }) {
  /** Provides shopping cart state and actions. */
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    saveCart(state);
  }, [state]);

  const value = useMemo(() => {
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      items: state.items,
      subtotal,
      itemCount,
      addToCart: (product, { quantity = 1, size } = {}) =>
        dispatch({ type: 'ADD', payload: { product, quantity, size } }),
      removeFromCart: (key) => dispatch({ type: 'REMOVE', payload: { key } }),
      setQuantity: (key, quantity) => dispatch({ type: 'SET_QTY', payload: { key, quantity } }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// PUBLIC_INTERFACE
export function useCart() {
  /** Hook to access cart state/actions. */
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
