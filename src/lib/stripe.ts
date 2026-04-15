/**
 * Stripe client initialization. Uses runtime key override from settings if set,
 * otherwise falls back to .env values. All Stripe API calls must be server-side only.
 */

import Stripe from 'stripe';
import { getOverrideSecretKey } from './settings-store';

function getSecretKey(): string {
  const override = getOverrideSecretKey();
  if (override) return override;
  const env = process.env.STRIPE_SECRET_KEY;
  if (!env) throw new Error('STRIPE_SECRET_KEY is not set. Configure .env or use /settings.');
  return env;
}

/** Returns a Stripe instance using the active secret key (override or .env). */
export function getStripe(): Stripe {
  return new Stripe(getSecretKey(), { apiVersion: '2023-10-16' });
}
