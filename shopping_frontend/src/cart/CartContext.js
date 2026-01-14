import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

const CART_STORAGE_KEY = 'shopping_cart_v1';

/**
 * @typedef {Object} CartItem
 * @property {string} key Unique line-item key (productId + variantKey)
 * @property {string} productId
 * @property {string} title
 * @property {string} image
 * @property {string} currency
 * @property {number} price
 * @property {number} qty
 * @property {{ variantId?: string, size?: string, color?: string }} [variant]
 * @property {string} [addedAt]
 */

/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items
 */

const initialState = /** @type {CartState} */ ({ items: [] });

/**
 * @param {unknown} v
 * @returns {v is CartState}
 */
function isCartState(v) {
  if (!v || typeof v !== 'object') return false;
  const s = /** @type {any} */ (v);
  if (!Array.isArray(s.items)) return false;
  return true;
}

/**
 * Creates a stable variant key for line-item identity.
 * - If variantId exists, prefer it.
 * - Else use size/color axes if present.
 *
 * @param {{variantId?: string, size?: string, color?: string}|undefined|null} variant
 * @returns {string}
 */
function toVariantKey(variant) {
  const v = variant || {};
  if (v.variantId) return `vid:${String(v.variantId)}`;
  const size = v.size ? String(v.size) : '';
  const color = v.color ? String(v.color) : '';
  if (!size && !color) return 'no-variant';
  return `opt:size=${encodeURIComponent(size)}&color=${encodeURIComponent(color)}`;
}

/**
 * @param {string} productId
 * @param {{variantId?: string, size?: string, color?: string}|undefined|null} variant
 * @returns {string}
 */
function toLineKey(productId, variant) {
  return `${String(productId)}__${toVariantKey(variant)}`;
}

/**
 * @param {unknown} raw
 * @returns {CartState}
 */
function safeDeserializeCart(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''));
    if (!isCartState(parsed)) return initialState;

    // Sanitize item fields to reduce risk of bad localStorage data breaking UI.
    const items = parsed.items
      .filter(Boolean)
      .map((it) => {
        const item = /** @type {any} */ (it);
        const qty = Number(item.qty ?? 0);
        const price = Number(item.price ?? 0);

        /** @type {CartItem} */
        const normalized = {
          key: String(item.key || toLineKey(item.productId, item.variant)),
          productId: String(item.productId || ''),
          title: String(item.title || 'Untitled'),
          image: String(item.image || ''),
          currency: String(item.currency || 'USD'),
          price: Number.isFinite(price) ? price : 0,
          qty: Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0,
          variant:
            item.variant && typeof item.variant === 'object'
              ? {
                  variantId: item.variant.variantId ? String(item.variant.variantId) : undefined,
                  size: item.variant.size ? String(item.variant.size) : undefined,
                  color: item.variant.color ? String(item.variant.color) : undefined,
                }
              : undefined,
          addedAt: item.addedAt ? String(item.addedAt) : undefined,
        };

        // Ensure key matches identity (avoid duplicates due to stale keys).
        normalized.key = toLineKey(normalized.productId, normalized.variant);

        return normalized;
      })
      .filter((it) => it.productId && it.qty > 0);

    return { items };
  } catch {
    return initialState;
  }
}

/**
 * @returns {CartState}
 */
function loadCartFromStorage() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return initialState;
    return safeDeserializeCart(raw);
  } catch {
    return initialState;
  }
}

/**
 * @param {CartState} state
 */
function saveCartToStorage(state) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / privacy mode failures; cart will be session-only.
  }
}

/**
 * @typedef {Object} AddItemPayload
 * @property {string} productId
 * @property {string} title
 * @property {string} [image]
 * @property {string} [currency]
 * @property {number} [price]
 * @property {number} [qty]
 * @property {{ variantId?: string, size?: string, color?: string }} [variant]
 */

/**
 * @typedef {Object} CartAction
 * @property {'ADD_ITEM'|'REMOVE_ITEM'|'SET_QTY'|'CLEAR'} type
 * @property {any} [payload]
 */

function cartReducer(state, action) {
  /** @type {CartState} */
  const s = state || initialState;

  if (action.type === 'CLEAR') {
    return { items: [] };
  }

  if (action.type === 'REMOVE_ITEM') {
    const key = String(action.payload?.key || '');
    if (!key) return s;
    return { items: s.items.filter((it) => it.key !== key) };
  }

  if (action.type === 'SET_QTY') {
    const key = String(action.payload?.key || '');
    const qty = Number(action.payload?.qty ?? 0);
    const nextQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
    if (!key) return s;

    // If qty is 0 => remove
    if (nextQty <= 0) return { items: s.items.filter((it) => it.key !== key) };

    return {
      items: s.items.map((it) => (it.key === key ? { ...it, qty: nextQty } : it)),
    };
  }

  if (action.type === 'ADD_ITEM') {
    /** @type {AddItemPayload} */
    const p = action.payload || {};
    const productId = String(p.productId || '');
    if (!productId) return s;

    const qty = Number(p.qty ?? 1);
    const addQty = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;

    const variant = p.variant && typeof p.variant === 'object' ? p.variant : undefined;
    const key = toLineKey(productId, variant);

    const existing = s.items.find((it) => it.key === key);
    if (existing) {
      return {
        items: s.items.map((it) => (it.key === key ? { ...it, qty: it.qty + addQty } : it)),
      };
    }

    /** @type {CartItem} */
    const nextItem = {
      key,
      productId,
      title: String(p.title || 'Untitled'),
      image: String(p.image || ''),
      currency: String(p.currency || 'USD'),
      price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0),
      qty: addQty,
      variant: variant
        ? {
            variantId: variant.variantId ? String(variant.variantId) : undefined,
            size: variant.size ? String(variant.size) : undefined,
            color: variant.color ? String(variant.color) : undefined,
          }
        : undefined,
      addedAt: new Date().toISOString(),
    };

    return { items: [nextItem, ...s.items] };
  }

  return s;
}

const CartContext = createContext(null);

/**
 * @typedef {Object} CartSelectors
 * @property {number} itemCount Total quantity across all lines
 * @property {number} lineCount Total number of line items
 * @property {number} subtotal Sum(price * qty)
 */

/**
 * @param {CartState} state
 * @returns {CartSelectors}
 */
function computeSelectors(state) {
  const items = state.items || [];
  let itemCount = 0;
  let subtotal = 0;

  for (const it of items) {
    const qty = Number(it.qty ?? 0);
    const price = Number(it.price ?? 0);
    itemCount += Number.isFinite(qty) ? qty : 0;
    subtotal += (Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) ? qty : 0);
  }

  return {
    itemCount,
    lineCount: items.length,
    subtotal,
  };
}

// PUBLIC_INTERFACE
export function CartProvider({ children }) {
  /** Provides cart state + actions with localStorage persistence. */
  const [state, dispatch] = useReducer(cartReducer, initialState, () => loadCartFromStorage());

  const hydratedRef = useRef(false);

  // Persist on changes. We skip the very first effect tick because the initializer already read localStorage.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveCartToStorage(state);
  }, [state]);

  // Optional: respond to ProductDetailsPage legacy event (kept compatible with existing stub).
  useEffect(() => {
    /** @param {Event} evt */
    const onAddToCartEvent = (evt) => {
      // Only supports minimal shape; pages should directly call useCart().addItem going forward.
      const detail = /** @type {any} */ (evt)?.detail || {};
      const productId = detail.productId ? String(detail.productId) : '';
      if (!productId) return;

      // We cannot enrich title/price/images without a product lookup; ignore gracefully.
      // This keeps the app stable even if someone dispatches the event.
    };

    window.addEventListener('shopping:addToCart', onAddToCartEvent);
    return () => window.removeEventListener('shopping:addToCart', onAddToCartEvent);
  }, []);

  const selectors = useMemo(() => computeSelectors(state), [state]);

  // PUBLIC_INTERFACE
  const addItem = useCallback((payload) => {
    /** Adds an item (or increments quantity if line exists). */
    dispatch({ type: 'ADD_ITEM', payload });
  }, []);

  // PUBLIC_INTERFACE
  const removeItem = useCallback((key) => {
    /** Removes a line item by key. */
    dispatch({ type: 'REMOVE_ITEM', payload: { key } });
  }, []);

  // PUBLIC_INTERFACE
  const setQty = useCallback((key, qty) => {
    /** Sets line item quantity; qty<=0 removes. */
    dispatch({ type: 'SET_QTY', payload: { key, qty } });
  }, []);

  // PUBLIC_INTERFACE
  const clearCart = useCallback(() => {
    /** Clears the cart. */
    dispatch({ type: 'CLEAR' });
  }, []);

  const value = useMemo(
    () => ({
      state,
      ...selectors,
      addItem,
      removeItem,
      setQty,
      clearCart,
    }),
    [state, selectors, addItem, removeItem, setQty, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// PUBLIC_INTERFACE
export function useCart() {
  /** Hook to access cart state, selectors, and actions. Must be used within CartProvider. */
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() must be used within <CartProvider>.');
  }
  return ctx;
}

// PUBLIC_INTERFACE
export function __private_toLineKey(productId, variant) {
  /** Test helper for deterministic line-item identity generation. */
  return toLineKey(productId, variant);
}
