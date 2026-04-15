import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

/**
 * GET /api/prices — List Stripe prices. Query param: product=<id> to filter by product.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product') ?? undefined;
    const stripe = getStripe();
    const prices = await stripe.prices.list({ limit: 100, active: true, product: productId });
    const data = prices.data.map((p) => ({
      id: p.id,
      nickname: p.nickname ?? null,
      unit_amount: p.unit_amount,
      currency: p.currency,
      recurring: p.recurring
        ? { interval: p.recurring.interval, interval_count: p.recurring.interval_count ?? 1 }
        : undefined,
    }));
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list prices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
