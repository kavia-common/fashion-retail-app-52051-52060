# Frontend API Contract (Fashion Retail App)

## Purpose and scope

This document defines a minimal, implementation-ready HTTP/JSON contract that the React frontend can build against while `shopping_backend` is not yet available. It intentionally focuses on a small set of endpoints needed for the product browsing flow, cart operations, checkout, and basic admin product management.

This contract is designed for REST over HTTPS/HTTP with JSON request and response bodies.

## Base URL and environment configuration

The frontend must compose the API base URL as:

`{BASE_URL} = ${REACT_APP_BACKEND_URL}${REACT_APP_API_BASE}`

Examples:
- If `REACT_APP_BACKEND_URL=http://localhost:8080` and `REACT_APP_API_BASE=/api`, then `BASE_URL=http://localhost:8080/api`.
- If `REACT_APP_BACKEND_URL=https://api.example.com` and `REACT_APP_API_BASE=/v1`, then `BASE_URL=https://api.example.com/v1`.

All endpoints below are relative to `{BASE_URL}`.

## Optional WebSocket (realtime updates)

If realtime updates are implemented, the frontend may connect to:

`REACT_APP_WS_URL`

This WebSocket is optional and intended for inventory and order updates (for example, notifying the UI when inventory changes or when an order state changes). Until implemented, the frontend should treat this as best-effort and degrade gracefully.

## Conventions

### Content type

- Requests with a body: `Content-Type: application/json`
- Responses: `Content-Type: application/json`

### Common headers (optional but recommended)

- `X-Client-Id: <string>` for anonymous client identification (useful if not using auth yet).  
  Note: The contract also includes `clientId` as a query parameter for `GET /cart` to keep things explicit.

### Date/time format

All date/time fields, if present, should be ISO 8601 strings in UTC, for example: `"2026-01-14T04:23:56.656Z"`.

### Money representation

This contract uses:
- `price` as a decimal number in major units (for example `49.99`).  
If the backend prefers integer cents later, a versioned migration should be planned.

### IDs

All IDs are strings (UUIDs or backend-generated opaque identifiers).

### Pagination

When endpoints support paging, they use `page` (1-based) and `pageSize`.

### Standard error shape

On errors (4xx/5xx), the backend should return:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {
      "any": "json"
    }
  }
}
```

`details` is optional and may include validation errors per field.

## Data models (shared)

### Product

```json
{
  "id": "prod_123",
  "title": "Relaxed Fit Denim Jacket",
  "description": "A classic denim jacket with a relaxed fit.",
  "brand": "Kavia Denim",
  "category": "Outerwear",
  "price": 79.99,
  "currency": "USD",
  "images": [
    "https://cdn.example.com/products/prod_123/1.jpg",
    "https://cdn.example.com/products/prod_123/2.jpg"
  ],
  "tags": ["denim", "jacket"],
  "variants": [
    {
      "variantId": "var_1",
      "size": "M",
      "color": "Blue",
      "sku": "KD-DENIMJKT-BLU-M",
      "inventory": 12
    }
  ],
  "isActive": true,
  "createdAt": "2026-01-14T04:23:56.656Z",
  "updatedAt": "2026-01-14T04:23:56.656Z"
}
```

Minimal validation rules:
- `title` is required and must be a non-empty string.
- `price` is required and must be a number `>= 0`.
- `images` should be an array of URL strings (may be empty).
- If `variants` are provided, each variant must have a unique `variantId` within the product.

### Cart

```json
{
  "cartId": "cart_abc",
  "clientId": "client_123",
  "items": [
    {
      "itemId": "item_1",
      "productId": "prod_123",
      "variantId": "var_1",
      "title": "Relaxed Fit Denim Jacket",
      "image": "https://cdn.example.com/products/prod_123/1.jpg",
      "unitPrice": 79.99,
      "currency": "USD",
      "quantity": 2,
      "lineTotal": 159.98
    }
  ],
  "subtotal": 159.98,
  "currency": "USD",
  "updatedAt": "2026-01-14T04:23:56.656Z"
}
```

Minimal validation rules:
- `quantity` must be an integer `>= 1`.
- `variantId` is optional only if the product is not variant-based; otherwise it should be required.

### Order summary (checkout response)

```json
{
  "orderId": "order_789",
  "cartId": "cart_abc",
  "currency": "USD",
  "subtotal": 159.98,
  "shipping": 10.0,
  "tax": 0.0,
  "total": 169.98,
  "itemsCount": 2
}
```

## 1) Products API

### GET /products

List products with optional search, sorting, and pagination.

#### Query parameters
- `q` (optional, string): Search query text (matches title/description/brand/category).
- `page` (optional, integer, default `1`, min `1`)
- `pageSize` (optional, integer, default `20`, min `1`, max `100`)
- `sort` (optional, string): Sort key. Supported values:
  - `relevance` (default if `q` present)
  - `newest`
  - `price_asc`
  - `price_desc`

#### Response: 200 OK

```json
{
  "items": [
    {
      "id": "prod_123",
      "title": "Relaxed Fit Denim Jacket",
      "price": 79.99,
      "currency": "USD",
      "images": ["https://cdn.example.com/products/prod_123/1.jpg"],
      "category": "Outerwear",
      "brand": "Kavia Denim",
      "isActive": true
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 125,
  "totalPages": 7
}
```

Status codes:
- `200 OK`: Success.
- `400 Bad Request`: Invalid paging or sort parameters.

### GET /products/{id}

Get a single product by ID.

#### Path parameters
- `id` (required, string): Product ID.

#### Response: 200 OK

Returns a full `Product` object as described in the shared model.

Status codes:
- `200 OK`: Found.
- `404 Not Found`: No product with that ID.
- `400 Bad Request`: Malformed ID.

## 2) Cart API

Cart endpoints support anonymous usage via `clientId` until auth exists.

### GET /cart

Get the current cart for a client.

#### Query parameters
- `clientId` (required, string): A stable client identifier stored by the frontend (for example in localStorage).

Minimal validation:
- `clientId` must be a non-empty string.

#### Response: 200 OK

Returns a `Cart` object.

Status codes:
- `200 OK`: Success (a cart is always returned; backend may create one implicitly).
- `400 Bad Request`: Missing/invalid `clientId`.

### POST /cart/items

Add an item to the cart. If the same product+variant already exists, the backend may merge by increasing quantity.

#### Request body

```json
{
  "clientId": "client_123",
  "productId": "prod_123",
  "variantId": "var_1",
  "quantity": 1
}
```

Minimal validation:
- `clientId` required, non-empty.
- `productId` required, non-empty.
- `quantity` required, integer `>= 1`.
- `variantId` required if the product has variants; otherwise may be omitted.

#### Response: 201 Created

Returns the updated `Cart` object.

Status codes:
- `201 Created`: Item added and updated cart returned.
- `400 Bad Request`: Validation failure (for example quantity < 1).
- `404 Not Found`: Product (or variant) does not exist.
- `409 Conflict`: Insufficient inventory (if enforced at add-to-cart time).

### PATCH /cart/items/{itemId}

Update an existing cart line (primarily quantity).

#### Path parameters
- `itemId` (required, string): Cart item ID.

#### Request body

```json
{
  "clientId": "client_123",
  "quantity": 3
}
```

Minimal validation:
- `clientId` required, non-empty.
- `quantity` required, integer `>= 1`.

#### Response: 200 OK

Returns the updated `Cart` object.

Status codes:
- `200 OK`: Updated.
- `400 Bad Request`: Validation failure.
- `404 Not Found`: Cart item not found.
- `409 Conflict`: Insufficient inventory.

### DELETE /cart/items/{itemId}

Remove an item from the cart.

#### Path parameters
- `itemId` (required, string): Cart item ID.

#### Query parameters (or header)
- `clientId` (required, string): Client ID (can be query param to keep it simple for fetch).

Example:
- `DELETE /cart/items/item_1?clientId=client_123`

Minimal validation:
- `clientId` required, non-empty.

#### Response: 200 OK

Returns the updated `Cart` object.

Status codes:
- `200 OK`: Removed.
- `400 Bad Request`: Missing/invalid `clientId`.
- `404 Not Found`: Cart item not found.

## 3) Checkout API

### POST /checkout

Create an order from a cart.

This endpoint finalizes totals, validates inventory, and returns an `orderId` plus a minimal summary. Payment is a placeholder for now.

#### Request body

```json
{
  "cartId": "cart_abc",
  "customer": {
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+1-555-0100"
  },
  "shippingAddress": {
    "line1": "123 Market St",
    "line2": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "US"
  },
  "paymentMethod": {
    "type": "placeholder",
    "provider": "none"
  }
}
```

Minimal validation:
- `cartId` required, non-empty.
- `customer.email` required, must look like an email (simple check: contains `@`).
- `shippingAddress.line1`, `city`, `postalCode`, `country` required and non-empty.
- `paymentMethod` is required but treated as a placeholder; backend may ignore contents for now.

#### Response: 201 Created

```json
{
  "orderId": "order_789",
  "summary": {
    "orderId": "order_789",
    "cartId": "cart_abc",
    "currency": "USD",
    "subtotal": 159.98,
    "shipping": 10.0,
    "tax": 0.0,
    "total": 169.98,
    "itemsCount": 2
  }
}
```

Status codes:
- `201 Created`: Checkout created successfully.
- `400 Bad Request`: Validation failure (missing fields, invalid email, etc.).
- `404 Not Found`: Cart not found.
- `409 Conflict`: Inventory changed and checkout cannot be completed with current cart quantities.

## 4) Admin Products API

These endpoints are intended for admin usage. Authentication and authorization are not specified in this repository yet; the backend should ultimately protect these routes. For now, the frontend can treat them as available and handle `401/403` if the backend enforces security.

### GET /admin/products

List products for admin management. This may include inactive products.

#### Query parameters (optional)
- `q` (optional, string): Search by title/brand/category.
- `page` (optional, integer, default `1`)
- `pageSize` (optional, integer, default `50`, max `200`)

#### Response: 200 OK

```json
{
  "items": [
    {
      "id": "prod_123",
      "title": "Relaxed Fit Denim Jacket",
      "price": 79.99,
      "currency": "USD",
      "category": "Outerwear",
      "brand": "Kavia Denim",
      "isActive": true,
      "updatedAt": "2026-01-14T04:23:56.656Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "totalItems": 125,
  "totalPages": 3
}
```

Status codes:
- `200 OK`: Success.
- `401 Unauthorized` / `403 Forbidden`: Not permitted (if enforced).
- `400 Bad Request`: Invalid paging.

### POST /admin/products

Create a new product.

#### Request body (Product create)

```json
{
  "title": "Relaxed Fit Denim Jacket",
  "description": "A classic denim jacket with a relaxed fit.",
  "brand": "Kavia Denim",
  "category": "Outerwear",
  "price": 79.99,
  "currency": "USD",
  "images": [
    "https://cdn.example.com/products/prod_123/1.jpg"
  ],
  "tags": ["denim", "jacket"],
  "variants": [
    {
      "variantId": "var_1",
      "size": "M",
      "color": "Blue",
      "sku": "KD-DENIMJKT-BLU-M",
      "inventory": 12
    }
  ],
  "isActive": true
}
```

Minimal validation:
- `title` required, non-empty.
- `price` required, number `>= 0`.
- `currency` required, 3-letter uppercase code (for example `USD`).
- If provided, each `images[i]` should be a URL string.
- If provided, `variants[*].inventory` must be an integer `>= 0`.

#### Response: 201 Created

Returns the created `Product` including `id`, `createdAt`, and `updatedAt`.

Status codes:
- `201 Created`: Created.
- `400 Bad Request`: Validation failure.
- `401 Unauthorized` / `403 Forbidden`: Not permitted.

### PUT /admin/products/{id}

Update an existing product (full update). The backend may implement this as a full replacement or an upsert-like update; for frontend purposes, treat this as updating all mutable fields.

#### Path parameters
- `id` (required, string): Product ID.

#### Request body

Same shape as POST /admin/products (all mutable product fields). The `id`, `createdAt`, and `updatedAt` are server-owned and should not be required in the request body.

Minimal validation:
- Same as create, plus `id` must exist.

#### Response: 200 OK

Returns the updated `Product`.

Status codes:
- `200 OK`: Updated.
- `400 Bad Request`: Validation failure.
- `401 Unauthorized` / `403 Forbidden`: Not permitted.
- `404 Not Found`: Product does not exist.

### DELETE /admin/products/{id}

Delete a product.

Deletion strategy is backend-defined. If soft delete is preferred, backend may set `isActive=false` rather than removing the record. The response should remain consistent.

#### Path parameters
- `id` (required, string): Product ID.

#### Response: 204 No Content

No response body.

Status codes:
- `204 No Content`: Deleted (or deactivated).
- `401 Unauthorized` / `403 Forbidden`: Not permitted.
- `404 Not Found`: Product does not exist.

## Notes for frontend implementation

The frontend can build a thin API client around these assumptions:

- All success responses are JSON except for `DELETE /admin/products/{id}`, which returns `204` with no body.
- On non-2xx, parse JSON error responses using the standard error shape when available, but also handle cases where the backend returns plain text or HTML (during early development).
- Store `clientId` in localStorage for cart continuity if authentication is not implemented yet.
- Treat `REACT_APP_WS_URL` as optional and do not block UI if WebSocket connection fails.
