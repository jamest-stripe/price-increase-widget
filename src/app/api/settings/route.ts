import { NextRequest, NextResponse } from 'next/server';
import {
  getOverridePublishableKey,
  getOverrideSecretKey,
  setOverrideKeys,
  clearOverrideKeys,
} from '@/lib/settings-store';

function maskSecretKey(key: string): string {
  if (!key || key.length < 8) return '••••';
  return key.slice(0, 7) + '...' + key.slice(-4);
}

/**
 * GET /api/settings — Returns masked current API keys (override or .env).
 */
export async function GET() {
  try {
    const pubOverride = getOverridePublishableKey();
    const secOverride = getOverrideSecretKey();
    const publishableKey = pubOverride ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY ?? '';
    const secretKey = secOverride ?? process.env.STRIPE_SECRET_KEY ?? '';
    return NextResponse.json({
      data: {
        publishableKey: publishableKey ? (publishableKey.slice(0, 12) + '...' + publishableKey.slice(-4)) : '',
        secretKeyMasked: maskSecretKey(secretKey),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/settings — Override API keys for the session. Body: { publishableKey?, secretKey? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.reset === true) {
      clearOverrideKeys();
    } else {
      const publishableKey = typeof body.publishableKey === 'string' && body.publishableKey.trim() ? body.publishableKey.trim() : null;
      const secretKey = typeof body.secretKey === 'string' && body.secretKey.trim() ? body.secretKey.trim() : null;
      setOverrideKeys(publishableKey, secretKey);
    }
    const pubOverride = getOverridePublishableKey();
    const secOverride = getOverrideSecretKey();
    const publishableKey = pubOverride ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY ?? '';
    const secretKey = secOverride ?? process.env.STRIPE_SECRET_KEY ?? '';
    return NextResponse.json({
      data: {
        publishableKey: publishableKey ? (publishableKey.slice(0, 12) + '...' + publishableKey.slice(-4)) : '',
        secretKeyMasked: maskSecretKey(secretKey),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
