# Fashion Retail Shopping App Overview

## Overview and goals

This project is a fashion retail shopping web app intended to support a typical e-commerce flow for end users (shoppers) and basic catalog management for admins. The current repository contains a React frontend container (`shopping_frontend`) and is designed to depend on a separate backend service (`shopping_backend`) for product data, cart/checkout processing, and administrative operations.

The primary goals of the app are:

- To allow shoppers to quickly browse and discover products, view detailed product information, and purchase items through a checkout flow.
- To provide basic administrative tooling to create and maintain the product catalog (add/edit products).
- To maintain a modern, responsive, light-themed user experience that works well on mobile and desktop.

## Key user roles and capabilities

### Shopper (end user)

Shoppers are expected to be able to:

- Browse products via a grid/list view.
- Search or filter products to find relevant items.
- View product details (images, sizing, pricing, description, inventory availability).
- Add products to a cart, adjust quantities, and remove items.
- Proceed through checkout and complete a purchase.

### Admin

Admins are expected to be able to:

- Access an admin-only section (admin dashboard).
- Add new products (title, price, images, description, category, inventory, variants).
- Edit existing products (including availability/inventory and metadata).
- Potentially manage additional catalog data such as categories, featured products, or promotions (future).

## Main features

This section describes the intended feature set for the shopping experience and admin capabilities. The current frontend code is a lightweight React template and does not yet implement these flows, so this list is an implementation target.

### Product browsing

- Product listing page showing a grid of product cards.
- Pagination or infinite scroll for large catalogs.
- Optional category navigation and sorting (price, newest, popularity).

### Search and filtering

- Text search (name, brand, category keywords).
- Filters such as category, size, color, price range, and availability.
- Sorting controls with clear UX (dropdown or segmented control).

### Product details

- Dedicated product detail view:
  - Image gallery (primary + secondary images).
  - Product description and key attributes.
  - Size/variant selection (if applicable).
  - Price display and promotional messaging.
  - Add-to-cart call-to-action.
- Inventory/availability messaging based on backend data.

### Cart

- Cart page or cart sidebar (as per layout preference).
- Quantity adjustments, remove items, and subtotal calculation.
- Persist cart state (at minimum in memory; typically localStorage; ideally server-side for authenticated users).

### Checkout

- Multi-step or single-page checkout experience:
  - Shipping address collection.
  - Delivery method (optional).
  - Payment entry (via a payment provider).
  - Order review and confirmation.
- Order confirmation page with order identifier and summary.

### Admin: add/edit products

- Admin dashboard listing products with search and filters.
- Product editor form for create/update:
  - Validation (required fields, numeric prices, inventory non-negative, image URL formats).
  - Save, cancel, and draft behavior (if supported).
- Auditability (optional): track who edited what and when (backend responsibility).

## High-level architecture

### Containers and responsibilities

- `shopping_frontend` (React, port 3000)
  - Presents all shopper and admin UI.
  - Reads configuration from environment variables exposed to the React build.
  - Calls `shopping_backend` over HTTP for product/catalog/cart/checkout operations.
  - Optionally uses WebSockets for realtime updates if supported (inventory changes, order status, etc.).

- `shopping_backend` (dependency; not present in this repository)
  - Owns product catalog data, inventory, pricing rules.
  - Owns checkout/order workflow, payment integration, and order persistence.
  - Owns authentication/authorization (admin vs shopper) if required.

### Current frontend implementation notes (what exists today)

The `shopping_frontend` currently contains a minimal React application and theming support:

- `src/App.js` implements a light/dark theme toggle by setting `data-theme` on `document.documentElement`.
- `src/App.css` defines CSS variables for light/dark themes and basic layout styling for the template page.
- No API client, routing, product pages, cart, or admin dashboard are implemented yet.

### Dependency diagram

```mermaid
flowchart LR
  FE["shopping_frontend (React SPA)"] -->|HTTP (REST/JSON)| BE["shopping_backend (API service)"]
  FE -->|Optional WebSocket| BE
```

## Frontend environment variables (.env)

The frontend container has a set of environment variables defined in its `.env`. In Create React App builds, variables prefixed with `REACT_APP_` are typically compiled into the client bundle and are therefore not secrets. They are usually used to configure runtime endpoints, feature flags, and environment-specific behavior.

The variables currently present are:

- `REACT_APP_API_BASE`
  - Typical usage: Base path for API routes (for example `/api`), or a full URL such as `https://api.example.com`.
  - Common pattern: `fetch(`${REACT_APP_API_BASE}/products`)`.

- `REACT_APP_BACKEND_URL`
  - Typical usage: Full origin for the backend service (scheme + host + port), for example `http://localhost:8080`.

- `REACT_APP_FRONTEND_URL`
  - Typical usage: Public URL of the frontend app, useful for building redirect URLs or linking (for example after OAuth flows).

- `REACT_APP_WS_URL`
  - Typical usage: WebSocket endpoint URL (for example `ws://localhost:8080/ws`) if realtime features are implemented.

- `REACT_APP_NODE_ENV`
  - Typical usage: An environment label (`development`, `staging`, `production`) for toggling client behaviors. Note that CRA already provides `process.env.NODE_ENV`; this app may choose to mirror or override it via this custom variable.

- `REACT_APP_NEXT_TELEMETRY_DISABLED`
  - Typical usage: Telemetry toggle in some stacks. In a CRA frontend, this may be carried over from templates; treat as a flag that can disable client telemetry hooks if present.

- `REACT_APP_ENABLE_SOURCE_MAPS`
  - Typical usage: Control whether source maps are generated/enabled. In CRA, build tooling generally controls this; this variable can be used to toggle custom logging or error reporting verbosity.

- `REACT_APP_PORT`
  - Typical usage: Intended port configuration. Note that CRA’s dev server port is typically controlled by `PORT` (without the `REACT_APP_` prefix). If this variable exists, document and enforce how it is used in scripts or runtime code.

- `REACT_APP_TRUST_PROXY`
  - Typical usage: Usually relevant to server apps behind proxies. In a frontend-only container, it may be unused unless a dev proxy layer is implemented.

- `REACT_APP_LOG_LEVEL`
  - Typical usage: Client-side logging verbosity (for example `debug`, `info`, `warn`, `error`). Useful to gate console output and diagnostics.

- `REACT_APP_HEALTHCHECK_PATH`
  - Typical usage: Path used for health checks (for example `/health`). In a static SPA this is commonly handled by the web server, but could be used to check backend reachability.

- `REACT_APP_FEATURE_FLAGS`
  - Typical usage: A serialized set of feature flags (for example JSON string or comma-separated list) enabling or disabling in-progress features.

- `REACT_APP_EXPERIMENTS_ENABLED`
  - Typical usage: Global toggle for A/B tests or experimental UI flows.

Implementation recommendation for env usage:
- Treat all `REACT_APP_*` variables as public configuration.
- Centralize access in a small module (for example `src/config.js`) that validates presence and supplies defaults.
- Prefer `REACT_APP_BACKEND_URL` + `REACT_APP_API_BASE` composition for API URLs to avoid scattering string concatenation.

## UI and style guidance (light theme + modern layout)

The project targets a light, modern UI with blue and teal accents. The repository currently implements a light/dark theme toggle and CSS-variable based theming in `src/App.css`, which should be extended to support the app’s layout and components.

### Theme and color guidance

- Theme: light by default, with optional dark mode support (already scaffolded via `data-theme` in `src/App.js`).
- Accent colors (from the provided style guide):
  - Primary accent: `#3b82f6` (blue)
  - Success/accent: `#06b6d4` (teal)
  - Background: `#f9fafb`
  - Surface: `#ffffff`
  - Text: `#111827`

Current implementation detail:
- `src/App.css` already uses CSS variables like `--bg-primary`, `--bg-secondary`, `--text-primary`, and `--button-bg`.
- To align with the style guide, update or extend these variables to match the provided palette and use them consistently across components.

### Layout guidance

The intended layout is responsive and should include:

- A top navigation bar
  - Brand/logo at left, search input centered or near the top, and cart/admin links on the right.
- A main product grid/listing area
  - Product cards with image, name, price, and quick-add.
- A cart sidebar or dedicated cart page
  - For desktop: sidebar is convenient; for mobile: a full page is typically better.
- An admin dashboard section
  - Separate route/area with product list and product editor forms.

### Typography and spacing

- Font: the app loads the “Inter” font via `public/index.html`.
- Prefer a clean scale:
  - Larger product names and prices, readable body text, consistent spacing (8px/4px spacing scale).
- Keep components lightweight and maintainable:
  - The frontend template emphasizes “no heavy UI frameworks” and uses vanilla CSS; continue in that style unless a framework is explicitly added.

## Assumptions and open questions

Because `shopping_backend` is a dependency and is not present here, several aspects are not yet grounded in code and must be confirmed before implementation:

- Backend API surface
  - What are the exact endpoints for products, search, cart, checkout, and admin product management?
  - Are endpoints REST, GraphQL, or mixed?
  - Do we have an OpenAPI spec?

- Authentication and authorization
  - Are shoppers anonymous, authenticated, or both?
  - How is admin access enforced (JWT, sessions, API keys)?
  - Do we need role-based access in the frontend routing (protected admin routes)?

- Payments
  - Which payment provider is used (Stripe, Adyen, PayPal, etc.)?
  - Does the backend create payment intents/sessions?
  - Is checkout embedded, redirected, or handled on a separate hosted page?

- Orders and cart persistence
  - Is the cart stored client-side, server-side, or both?
  - Should carts persist across devices (requires auth)?
  - What is the order lifecycle (created, paid, fulfilled, cancelled)?

- Realtime/WebSocket usage
  - Is `REACT_APP_WS_URL` required for the MVP?
  - What events would be published (inventory changes, order status)?

- Product data model
  - Required fields: variants (size/color), images, categories, inventory rules.
  - How are out-of-stock items represented?

## Next steps and recommendations

1. Define and document the backend contract first. A minimal OpenAPI spec for `shopping_backend` will significantly reduce integration churn and enable frontend scaffolding (types, client helpers, mock server).

2. Establish the routing and page skeleton in `shopping_frontend`. At minimum, plan for:
   - `/` or `/products` (browse)
   - `/products/:id` (details)
   - `/cart`
   - `/checkout`
   - `/admin` and `/admin/products/:id` (admin)

3. Introduce a simple API client layer. Centralize `fetch` logic, error handling, timeouts, and base URL composition from `REACT_APP_BACKEND_URL` and/or `REACT_APP_API_BASE`.

4. Extend theming tokens in CSS. Align the existing CSS variables in `src/App.css` with the provided palette and ensure consistent usage across navigation, cards, buttons, and form inputs.

5. Decide on cart persistence strategy. Start with localStorage for MVP if auth is not yet implemented, then migrate to server-side carts when authentication exists.

6. Clarify admin authentication requirements early. Admin add/edit product features require secure authorization; do not rely solely on frontend route hiding.

Task completed: Created `docs/app_overview.md` documenting goals, roles, features, architecture, environment configuration, UI guidance, open questions, and next steps.
