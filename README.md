# Norza Backend API

A complete Node.js + Express + MongoDB backend for the [Norza e-commerce site](https://7kullervo.github.io/Norza-Ecommerce/). Covers authentication, products, cart, orders, Stripe payments, an admin panel API, product reviews, and contact form submissions.

## 1. Setup

```bash
cd norza-backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — a local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster connection string.
- `JWT_SECRET` — any long random string.
- `CLIENT_URL` — the origin of your frontend (for CORS + Stripe redirects). Defaults to the live GitHub Pages URL.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — from your [Stripe dashboard](https://dashboard.stripe.com/apikeys) (use test keys while developing).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the auto-created admin account.

Seed the database with the real products from the Norza site plus an admin account:

```bash
npm run seed
```

Run the server:

```bash
npm run dev     # with nodemon (auto-restart)
npm start        # plain node
```

Server runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## 2. Project structure

```
norza-backend/
├── config/db.js            MongoDB connection
├── models/                 Mongoose schemas (User, Product, Cart, Order, Review, ContactMessage)
├── middleware/              auth (JWT), error handling
├── controllers/             route logic
├── routes/                  Express routers
├── utils/generateToken.js   JWT signing + cookie helper
├── seed/seedProducts.js     seeds real Norza products + admin user
└── server.js                app entrypoint
```

## 3. Authentication

JWT-based. Token is returned in the JSON response **and** set as an httpOnly cookie. Send it either way on subsequent requests:

```
Authorization: Bearer <token>
```

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ name, email, password }` |
| POST | `/api/auth/login` | Public | `{ email, password }` |
| POST | `/api/auth/logout` | Private | clears auth cookie |
| GET | `/api/auth/me` | Private | current user profile |
| PUT | `/api/auth/me` | Private | update name / password / addresses |

## 4. Products

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Public | list/search/filter/paginate |
| GET | `/api/products/meta/categories` | Public | category counts |
| GET | `/api/products/:idOrSlug` | Public | single product |
| POST | `/api/products` | Admin | create product |
| PUT | `/api/products/:id` | Admin | update product |
| DELETE | `/api/products/:id` | Admin | soft-delete product |

Query params on `GET /api/products`: `keyword`, `category`, `brand`, `minPrice`, `maxPrice`, `featured=true`, `newArrival=true`, `sort=price_asc|price_desc|rating|newest`, `page`, `limit`.

Product `category` enum matches the site's sections: `clothing`, `watches`, `shoes`, `snacks`, `produce`, `electronics`, `accessories`, `beauty`.

## 5. Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products/:productId/reviews` | Public | list reviews for a product |
| POST | `/api/products/:productId/reviews` | Private | `{ rating, comment }` — one review per user per product |
| DELETE | `/api/reviews/:id` | Private (owner/admin) | delete a review |

Product `rating` / `numReviews` are recalculated automatically whenever a review is added or removed.

## 6. Cart

All routes require auth. Cart is server-side, one per user.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart` | get current cart |
| POST | `/api/cart/items` | `{ productId, quantity }` — add/increment item |
| PUT | `/api/cart/items/:productId` | `{ quantity }` — set exact quantity |
| DELETE | `/api/cart/items/:productId` | remove one item |
| DELETE | `/api/cart` | empty the cart |

## 7. Orders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | create order from current cart; `{ shippingAddress, paymentMethod }`. `paymentMethod` is `"stripe"` or `"cash_on_delivery"`. Validates stock, locks in prices, decrements stock, empties cart. |
| GET | `/api/orders/my` | current user's orders |
| GET | `/api/orders/:id` | single order (owner or admin) |
| PUT | `/api/orders/:id/cancel` | cancel an unshipped order and restock items |

Pricing: shipping is a flat $10 (free over $100 in items), tax is 8%.

## 8. Payments (Stripe)

1. Frontend creates an order via `POST /api/orders` (`paymentMethod: "stripe"`).
2. Frontend calls `POST /api/payments/create-checkout-session` with `{ orderId }` → returns a Stripe Checkout `url` to redirect the user to.
3. On success, Stripe redirects to `${CLIENT_URL}/order-success.html?orderId=...` and sends a `checkout.session.completed` webhook to `POST /api/payments/webhook`, which marks the order `isPaid: true` and status `processing`.

To test webhooks locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

## 9. Admin panel API

All routes require `role: "admin"`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | user/product/order counts, total revenue, low-stock products |
| GET | `/api/admin/users` | list all users |
| PUT | `/api/admin/users/:id` | `{ role, isActive }` — promote/deactivate a user |
| GET | `/api/admin/orders` | list all orders (`?status=`, pagination) |
| PUT | `/api/admin/orders/:id/status` | update order status |

Product create/update/delete also live under `/api/products` (see section 4) and require admin.

## 10. Contact Us

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/contact` | Public | `{ name, email, subject, message }` — powers the site's Contact Us form |
| GET | `/api/contact` | Admin | list messages |
| PUT | `/api/contact/:id/read` | Admin | mark as read |

## 11. Connecting the existing frontend

The site currently has no JS wired up to a backend. For each page:

- **Shop.html** — fetch `GET /api/products`, render cards, wire "Buy Now" to `POST /api/cart/items`.
- **cart.html** — fetch `GET /api/cart`, wire quantity controls to the cart PUT/DELETE routes, and checkout to `POST /api/orders` → `POST /api/payments/create-checkout-session`.
- **Contact_us.html** — wire the form to `POST /api/contact`.
- Add `login.html` / `register.html` (not present yet) using `/api/auth/register` and `/api/auth/login`, storing the returned token (e.g. in memory + relying on the httpOnly cookie, or `localStorage` if you prefer client-managed tokens).
- The chat widget currently shown on the homepage is static HTML with no logic — it isn't wired to anything, so it's out of scope here unless you want a real chat/support endpoint added too.

Since GitHub Pages only serves static files, you'll need to deploy this backend separately (e.g. Render, Railway, Fly.io) and point the frontend's `fetch()` calls at that URL. Also add your deployed frontend's exact origin to `CLIENT_URL` for CORS to work.

## 12. Security notes included

- Passwords hashed with bcrypt.
- JWT auth with httpOnly cookie option.
- `helmet` for HTTP headers, `cors` locked to `CLIENT_URL`.
- Rate limiting on `/api/auth/*`.
- Stripe webhook signature verification.
- Server-side price/stock recalculation on order creation (never trusts client-sent prices).
