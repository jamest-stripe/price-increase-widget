# Stripe Price Increase

A Next.js app that demonstrates **Stripe Revenue Suite - Price Increase** workflows: list and filter subscriptions, then schedule price increases using Subscription Schedules.

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Set your Stripe keys in `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

## Routes

- **/** — Homepage with vertical tabs and links to each route.
- **/subscription** — Search subscriptions (by product, price, status, standalone/bundle), select rows, set price increase (% or $) and effective date, then submit to create/update subscription schedules.
- **/settings** — View masked API keys and optionally override them for the session.

## API

- `GET /api/products` — List Stripe products.
- `GET /api/prices?product=<id>` — List prices (optional product filter).
- `GET /api/subscriptions?status=&price=` — List subscriptions (expand customer).
- `POST /api/subscriptions/schedule` — Apply price increase to selected subscriptions (body: `subscriptionIds`, `increaseType`, `increaseValue`, `effectiveDate`, optional `priceId`).
- `GET /api/settings` — Masked keys.
- `POST /api/settings` — Override or reset keys (body: `publishableKey`, `secretKey`, or `reset: true`).

All Stripe calls are server-side only. See `agents.md` for full spec.
