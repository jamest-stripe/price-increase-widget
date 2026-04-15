Here's a refined version of your AGENTS.md file with improved clarity, structure, and technical detail:

```markdown
# AGENTS.md

## Description

A Next.js single-page application that demonstrates **Stripe Revenue Suite - Price Increase** workflows. The app showcases how to manage subscription price increases using:

- **Stripe Subscriptions API** — List and filter subscriptions
- **Stripe Subscription Schedules API** — Schedule price increase phases
- **Stripe Invoicing** — Preview upcoming invoice impact

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict mode)
- **UI Library:** MUI (Material UI) — https://mui.com/
- **Stripe SDK:** `stripe` (Node.js, server-side), `@stripe/stripe-js` (client-side if needed)

## Configuration

All configurable values live in `/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The `/settings` page allows runtime override of these keys (see Routes below).

## Setup Commands

```bash
npm install
```

## Run the App

```bash
npm run dev
```

## Code Style

- TypeScript strict mode enabled in `tsconfig.json`
- Use functional components and patterns (no class components)
- Use `async/await` for all asynchronous operations
- Document all exported functions and components with JSDoc comments
- All Stripe API calls must be server-side only (API routes / server actions) — never expose secret keys to the client
- Use MUI's `sx` prop or `styled()` for styling — no raw CSS files
- Handle errors gracefully with user-visible error messages (MUI `Alert` or `Snackbar`)

## Project Structure

```
/
├── .env                        # API keys and configuration
├── src/
│   ├── app/
│   │   ├── page.tsx            # Homepage — route index
│   │   ├── layout.tsx          # Root layout with MUI ThemeProvider
│   │   ├── subscription/
│   │   │   └── page.tsx        # Subscription management page
│   │   ├── settings/
│   │   │   └── page.tsx        # API key settings page
│   │   └── api/
│   │       ├── subscriptions/  # Subscription-related API routes
│   │       ├── products/       # Product lookup API routes
│   │       ├── prices/         # Price lookup API routes
│   │       └── settings/       # Settings read/write API routes
│   ├── lib/
│   │   └── stripe.ts           # Stripe client initialization (uses runtime key override if set)
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types/interfaces
│   └── components/
│       └── ...                 # Reusable MUI components
```

## Routes

### `/` — Homepage

Displays an index of all implemented routes.

**Layout:**
- Left side: a vertical set of **MUI Tabs** (oriented vertically) listing each route
- Right side: a content area showing the description of the currently selected tab
- Each tab entry includes: route name, brief description, and a clickable link (`<Link>`) to navigate to the route
- All tab panels must be **equal height** (use a fixed min-height or flex layout)
- Clicking a tab highlights it and shows its description; clicking the link navigates to the route

### `/subscription` — Subscription Management

This is the core page of the app. It allows the user to search Stripe subscriptions, select them, and schedule a price increase.

**Filter Bar (top of page):**

A horizontal row of filter fields using MUI `TextField`, `Autocomplete`, and `Select`:

| Filter | Type | Behavior |
|---|---|---|
| **Search by Product** | `Autocomplete` | Fetches products from Stripe (`/v1/products`). Displays `product.name` and `product.id` in the dropdown. When selected, fetches all prices under that product (`/v1/prices?product={id}`), then returns subscriptions containing any of those prices. |
| **Search by Price** | `Autocomplete` | Fetches prices from Stripe (`/v1/prices`). Displays `price.nickname` (or unit_amount + currency) and `price.id`. Filters subscriptions by this specific price ID using `price` parameter on `/v1/subscriptions/list`. |
| **Subscription Status** | `Select` | Options: `active`, `past_due`, `canceled`, `trialing`, `all`. Maps to the `status` parameter on `/v1/subscriptions/list`. **Default: `active`** (do not use `all` as default). |
| **Standalone or Bundle** | `Select` | Options: `All`, `Standalone`, `Bundle`. Applied **client-side** after fetching results. `Standalone` = subscription has exactly 1 line item. `Bundle` = subscription has 2+ line items. **Default: `Standalone`**. |

A **"Search"** button triggers the query.

**Price Increase Action Bar (above the results table, below filters):**

A horizontal row with:

| Field | Type | Notes |
|---|---|---|
| **Price Increase %** | `TextField` (number) | Mutually exclusive with Price Increase $. Percentage increase to apply. |
| **Price Increase $** | `TextField` (number) | Mutually exclusive with Price Increase %. Absolute dollar increase to apply. |
| **Effective Date** | `DatePicker` (MUI X) | The date the new price takes effect. Must be a future date. |
| **Submit** | `Button` | Disabled until: (a) at least one subscription is checked, (b) either % or $ is filled (not both), and (c) effective date is filled. |

**Results Table:**

An MUI `DataGrid` or `Table` with the following columns:

| Column | Source |
|---|---|
| ☐ (Checkbox) | Selection checkbox |
| Customer Name | `subscription.customer.name` (expand customer) |
| Customer ID | `subscription.customer.id` |
| Subscription ID | `subscription.id` |
| Subscription Status | `subscription.status` |
| Start Date | `subscription.start_date` (formatted) |
| End Date | `subscription.current_period_end` (formatted) |
| Line Items | Count of `subscription.items.data` (indicates standalone vs bundle) |

**Submit Behavior:**

When the **Submit** button is clicked, for each selected subscription:

1. Calculate the new unit price:
   - If **Price Increase %**: `new_price = old_price * (1 + percentage / 100)`, rounded to nearest integer (cents)
   - If **Price Increase $**: `new_price = old_price + dollar_amount_in_cents`
2. Create a new Price object in Stripe with the calculated amount (same currency, interval, product as original) via `POST /v1/prices`
3. If it is already a subscription schedule, then don't convert. If it is a subsription, convert the subscription to a **Subscription Schedule** via `POST /v1/subscription_schedules` with `from_subscription: subscription.id` — see https://docs.stripe.com/api/subscription_schedules/create
4. Update the schedule to add a **new phase** starting on the **Effective Date**, with the new price replacing the old price in the subscription items — see https://docs.stripe.com/api/subscription_schedules/update
5. Add metadata to the subscription: `{ "price_increase_date": "<current ISO date>" }`
6. Show a success or error `Snackbar` for each subscription processed

**Important implementation notes:**
- All Stripe API calls happen server-side via Next.js API routes
- Use pagination when listing subscriptions (Stripe returns max 100 per call)
- Expand `customer` and `items` when fetching subscriptions: `expand: ['data.customer']`
- For bundle subscriptions with multiple line items, the price increase applies only to the price that was searched/filtered on

### `/settings` — API Key Configuration

Allows the user to view and override the Stripe API keys.

**Behavior:**
- On load, display the current keys from `/.env` (masked, e.g., `sk_test_...xxxx`)
- Two `TextField` inputs: **Publishable Key** and **Secret Key**
- A **"Save"** button that stores the overridden keys in server-side memory (or a session/cookie) for the duration of the app session
- A **"Reset to Default"** button that reverts to the `.env` values
- The `lib/stripe.ts` client initialization must check for runtime overrides before falling back to `.env` values
- **Never expose the full secret key in the UI** — mask all but the last 4 characters

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/products` | GET | List Stripe products |
| `/api/prices` | GET | List Stripe prices. Accepts `?product=` query param. |
| `/api/subscriptions` | GET | List subscriptions with filters (`status`, `price`, `customer`). Expands `customer`. |
| `/api/subscriptions/schedule` | POST | Converts selected subscriptions to schedules and adds price increase phase. Body: `{ subscriptionIds, increaseType, increaseValue, effectiveDate }` |
| `/api/settings` | GET | Returns masked current API keys |
| `/api/settings` | POST | Overrides API keys for the session |

## Error Handling

- All API routes return consistent JSON: `{ data: ... }` on success, `{ error: string }` on failure
- Client-side: catch errors and display them using MUI `Alert` components
- Validate inputs before making API calls (e.g., effective date must be in the future)
```

