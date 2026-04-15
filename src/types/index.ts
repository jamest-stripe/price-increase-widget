/**
 * Shared TypeScript types and interfaces for the Stripe Price Increase app.
 */

/** Stripe product (minimal for dropdown) */
export interface ProductOption {
  id: string;
  name: string;
}

/** Stripe price (minimal for dropdown and API) */
export interface PriceOption {
  id: string;
  nickname: string | null;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string; interval_count: number };
}

/** Customer expanded on subscription */
export interface SubscriptionCustomer {
  id: string;
  name: string | null;
  email?: string | null;
}

/** Subscription line item (minimal) */
export interface SubscriptionItem {
  id: string;
  price: { id: string; unit_amount: number | null; currency: string; product: string; recurring?: { interval: string; interval_count: number } };
}

/** Subscription as returned from API (with expanded customer) */
export interface SubscriptionWithCustomer {
  id: string;
  status: string;
  start_date: number;
  current_period_end: number;
  customer: SubscriptionCustomer | string;
  items: { data: SubscriptionItem[] };
  schedule?: string | null;
  metadata?: Record<string, string>;
}

/** Filters for listing subscriptions */
export interface SubscriptionFilters {
  status?: string;
  price?: string;
  product?: string;
}

/** Body for schedule API */
export interface ScheduleRequestBody {
  subscriptionIds: string[];
  increaseType: 'percent' | 'dollar';
  increaseValue: number;
  effectiveDate: string; // ISO date
  priceId?: string; // for bundle: which price to increase
}

/** Masked API keys response */
export interface SettingsResponse {
  publishableKey: string;
  secretKeyMasked: string;
}
