/**
 * In-memory store for runtime Stripe API key overrides.
 * Used by /settings to override .env keys for the app session.
 * Note: In serverless, this may not persist across instances; for production consider Redis or session.
 */

let overridePublishableKey: string | null = null;
let overrideSecretKey: string | null = null;

export function getOverridePublishableKey(): string | null {
  return overridePublishableKey;
}

export function getOverrideSecretKey(): string | null {
  return overrideSecretKey;
}

export function setOverrideKeys(publishable: string | null, secret: string | null): void {
  overridePublishableKey = publishable;
  overrideSecretKey = secret;
}

export function clearOverrideKeys(): void {
  overridePublishableKey = null;
  overrideSecretKey = null;
}
