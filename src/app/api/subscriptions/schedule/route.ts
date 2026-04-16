import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import type { ScheduleRequestBody } from '@/types';

/**
 * POST /api/subscriptions/schedule — Convert subscriptions to schedules and add price increase phase.
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequestBody = await request.json();
    const { subscriptionIds, increaseType, increaseValue, effectiveDate, priceId: filterPriceId } = body;
    if (!subscriptionIds?.length || !effectiveDate) {
      return NextResponse.json(
        { error: 'subscriptionIds and effectiveDate are required' },
        { status: 400 }
      );
    }
    if (increaseType !== 'percent' && increaseType !== 'dollar') {
      return NextResponse.json({ error: 'increaseType must be percent or dollar' }, { status: 400 });
    }
    const effectiveTimestamp = Math.floor(new Date(effectiveDate).getTime() / 1000);
    if (effectiveTimestamp <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: 'effectiveDate must be in the future' }, { status: 400 });
    }

    const stripe = getStripe();
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const subId of subscriptionIds) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ['items.data.price', 'schedule'],
        });
        const items = sub.items.data;
        const targetPriceId = filterPriceId || (items.length === 1 ? items[0].price.id : undefined);
        if (!targetPriceId) {
          results.push({ id: subId, success: false, error: 'Could not determine which price to increase' });
          continue;
        }
        const item = items.find((i) => (i.price as Stripe.Price).id === targetPriceId);
        if (!item) {
          results.push({ id: subId, success: false, error: 'Target price not found on subscription' });
          continue;
        }
        const price = item.price as Stripe.Price;
        const oldAmount = price.unit_amount ?? 0;
        let newAmount: number;
        if (increaseType === 'percent') {
          newAmount = Math.round(oldAmount * (1 + increaseValue / 100));
        } else {
          newAmount = oldAmount + Math.round(increaseValue * 100);
        }
        if (newAmount < 0) {
          results.push({ id: subId, success: false, error: 'Calculated price would be negative' });
          continue;
        }

        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        const recurring = price.recurring;
        if (!recurring) {
          results.push({ id: subId, success: false, error: 'One-time prices are not supported' });
          continue;
        }

        const taxBehavior = (price as Stripe.Price & { tax_behavior?: string }).tax_behavior ?? 'exclusive';
        const newPrice = await stripe.prices.create({
          currency: price.currency,
          product: productId,
          unit_amount: newAmount,
          tax_behavior: taxBehavior as 'exclusive' | 'inclusive' | 'unspecified',
          recurring: {
            interval: recurring.interval,
            interval_count: recurring.interval_count ?? 1,
          },
        });

        let scheduleId: string;
        let currentPhases: Stripe.SubscriptionSchedule.Phase[];

        if (sub.schedule && typeof sub.schedule === 'object') {
          scheduleId = sub.schedule.id;
          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId, { expand: ['phases'] });
          currentPhases = schedule.phases;
        } else {
          const created = await stripe.subscriptionSchedules.create({
            from_subscription: subId,
          });
          scheduleId = created.id;
          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId, { expand: ['phases'] });
          currentPhases = schedule.phases;
        }

        const lastPhase = currentPhases[currentPhases.length - 1];
        const phaseItems = lastPhase.items.map((pi) => {
          const existingPriceId = typeof pi.price === 'string' ? pi.price : pi.price?.id;
          return {
            price: existingPriceId === targetPriceId ? newPrice.id : existingPriceId,
            quantity: pi.quantity ?? 1,
          };
        });

        type PhaseParam = {
          items: Array<{ price: string; quantity: number }>;
          start_date: number;
          end_date?: number;
          metadata?: Record<string, string>;
        };
        const phases: PhaseParam[] = [
          ...currentPhases.slice(0, -1).map((p) => ({
            items: p.items.map((i) => ({
              price: typeof i.price === 'string' ? i.price : (i.price as Stripe.Price)?.id ?? '',
              quantity: i.quantity ?? 1,
            })),
            start_date: p.start_date,
            end_date: p.end_date,
            metadata: p.metadata as Record<string, string> | undefined,
          })),
          {
            items: lastPhase.items.map((i) => ({
              price: typeof i.price === 'string' ? i.price : (i.price as Stripe.Price)?.id ?? '',
              quantity: i.quantity ?? 1,
            })),
            start_date: lastPhase.start_date,
            end_date: effectiveTimestamp,
            metadata: lastPhase.metadata as Record<string, string> | undefined,
          },
          {
            items: phaseItems,
            start_date: effectiveTimestamp,
            metadata: { price_increase_date: new Date().toISOString().slice(0, 10) },
          },
        ];

        await stripe.subscriptionSchedules.update(scheduleId, {
          default_settings: {
            automatic_tax: { enabled: true },
          },
          phases: phases as Stripe.SubscriptionScheduleUpdateParams.Phase[],
          end_behavior: 'release',
        });

        await stripe.subscriptions.update(subId, {
          metadata: { price_increase_date: new Date().toISOString().slice(0, 10) },
        });

        results.push({ id: subId, success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: subId, success: false, error: message });
      }
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to schedule price increase';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
