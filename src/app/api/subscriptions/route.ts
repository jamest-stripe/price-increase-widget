import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

const EXPAND = ['data.customer', 'data.items.data.price'] as const;
const LIMIT = 100;

function mapSubscription(s: Stripe.Subscription) {
  return {
    id: s.id,
    status: s.status,
    start_date: s.start_date,
    current_period_end: s.current_period_end,
    customer: s.customer,
    items: { data: s.items.data },
    schedule: s.schedule ?? null,
    metadata: s.metadata ?? {},
  };
}

/**
 * GET /api/subscriptions — List subscriptions with filters (status, price).
 * Only returns subscriptions that are associated with a test clock (see https://docs.stripe.com/api/test_clocks).
 * Excludes subscriptions without a test clock to speed up search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'active';
    const price = searchParams.get('price') ?? undefined;

    const stripe = getStripe();
    const baseParams: Record<string, unknown> = {
      limit: LIMIT,
      expand: EXPAND,
    };
    if (status !== 'all') baseParams.status = status;
    if (price) baseParams.price = price;

    const allData: ReturnType<typeof mapSubscription>[] = [];
    const seenIds = new Set<string>();

    const addSubs = (subs: Stripe.Subscription[]) => {
      for (const s of subs) {
        if (seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        allData.push(mapSubscription(s));
      }
    };

    const testClocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
    const clocks = testClocks.data;
    let testClockPage: Stripe.ApiList<Stripe.TestHelpers.TestClock> = testClocks;
    while (testClockPage.has_more && testClockPage.data.length) {
      const next = await stripe.testHelpers.testClocks.list({
        limit: 100,
        starting_after: testClockPage.data[testClockPage.data.length - 1].id,
      });
      clocks.push(...next.data);
      testClockPage = next;
    }

    for (const clock of clocks) {
      const tcParams: Stripe.SubscriptionListParams = {
        ...baseParams,
        test_clock: clock.id,
      } as Stripe.SubscriptionListParams;
      let tcSubs = await stripe.subscriptions.list(tcParams);
      addSubs(tcSubs.data);
      while (tcSubs.has_more && tcSubs.data.length) {
        tcSubs = await stripe.subscriptions.list({
          ...tcParams,
          starting_after: tcSubs.data[tcSubs.data.length - 1].id,
        });
        addSubs(tcSubs.data);
      }
    }

    return NextResponse.json({
      data: allData,
      has_more: false,
      next_starting_after: undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list subscriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
