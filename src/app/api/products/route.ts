import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

/**
 * GET /api/products — List Stripe products.
 */
export async function GET() {
  try {
    const stripe = getStripe();
    const products = await stripe.products.list({ limit: 100, active: true });
    const data = products.data.map((p) => ({ id: p.id, name: p.name }));
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
