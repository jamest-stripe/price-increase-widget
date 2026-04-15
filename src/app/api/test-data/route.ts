import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

const FROZEN_TIME = 1772283600;
const PRICE_SINGLE = 'price_1T0YAUQ8CnbogUZdCbVXO0Qr';
const PRICE_BUNDLE_EXTRA = 'price_1SYFufQ8CnbogUZdEOJmLJoK';
const PAYMENT_METHOD = 'pm_card_au';

const sharedCustomerParams = {
  email: 'williamyu@stripe.com',
  phone: '+61 3 1234 5678',
  preferred_locales: ['en-AU'],
  payment_method: PAYMENT_METHOD,
  invoice_settings: {
    default_payment_method: PAYMENT_METHOD,
    rendering_options: { amount_tax_display: 'include_inclusive_tax' },
    custom_fields: [{ name: 'AU', value: 'Tax Invoice' }],
  },
  address: {
    city: 'Melbourne',
    country: 'AU',
    line1: '1 Collins Street',
    postal_code: '3000',
    state: 'VIC',
  },
} satisfies Omit<
  Stripe.CustomerCreateParams,
  'test_clock' | 'name' | 'description' | 'metadata'
>;

/**
 * POST /api/test-data — Load PriceIncrease test data: 2 test clocks, 6 customers, 6 subscriptions.
 */
export async function POST() {
  try {
    const stripe = getStripe();

    const clock1 = await stripe.testHelpers.testClocks.create({
      frozen_time: FROZEN_TIME,
      name: 'PriceIncrease1',
    });

    const [jane, brendan, lisa] = await Promise.all([
      stripe.customers.create({
        test_clock: clock1.id,
        name: 'Jane',
        description: 'PriceIncrease1',
        metadata: { ProductType: 'single' },
        ...sharedCustomerParams,
      }),
      stripe.customers.create({
        test_clock: clock1.id,
        name: 'Brendan',
        description: 'PriceIncrease1',
        metadata: { ProductType: 'single' },
        ...sharedCustomerParams,
      }),
      stripe.customers.create({
        test_clock: clock1.id,
        name: 'Lisa',
        description: 'PriceIncrease1',
        metadata: { ProductType: 'bundle' },
        ...sharedCustomerParams,
      }),
    ]);

    const clock2 = await stripe.testHelpers.testClocks.create({
      frozen_time: FROZEN_TIME,
      name: 'PriceIncrease2',
    });

    const [tina, elsa, jack] = await Promise.all([
      stripe.customers.create({
        test_clock: clock2.id,
        name: 'Tina',
        description: 'PriceIncrease2',
        metadata: { ProductType: 'bundle' },
        ...sharedCustomerParams,
      }),
      stripe.customers.create({
        test_clock: clock2.id,
        name: 'Elsa',
        description: 'PriceIncrease2',
        metadata: { ProductType: 'single' },
        ...sharedCustomerParams,
      }),
      stripe.customers.create({
        test_clock: clock2.id,
        name: 'Jack',
        description: 'PriceIncrease2',
        metadata: { ProductType: 'single' },
        ...sharedCustomerParams,
      }),
    ]);

    await Promise.all([
      stripe.subscriptions.create({
        customer: jane.id,
        items: [{ price: PRICE_SINGLE, quantity: 1 }],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
      stripe.subscriptions.create({
        customer: brendan.id,
        items: [{ price: PRICE_SINGLE, quantity: 1 }],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
      stripe.subscriptions.create({
        customer: lisa.id,
        items: [
          { price: PRICE_SINGLE, quantity: 1 },
          { price: PRICE_BUNDLE_EXTRA, quantity: 1 },
        ],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
      stripe.subscriptions.create({
        customer: tina.id,
        items: [
          { price: PRICE_SINGLE, quantity: 1 },
          { price: PRICE_BUNDLE_EXTRA, quantity: 1 },
        ],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
      stripe.subscriptions.create({
        customer: elsa.id,
        items: [{ price: PRICE_SINGLE, quantity: 1 }],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
      stripe.subscriptions.create({
        customer: jack.id,
        items: [{ price: PRICE_SINGLE, quantity: 1 }],
        collection_method: 'charge_automatically',
        automatic_tax: { enabled: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        message: 'PriceIncrease test data loaded.',
        test_clocks: [clock1.id, clock2.id],
        customers: [jane.id, brendan.id, lisa.id, tina.id, elsa.id, jack.id],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load test data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const TEST_CLOCK_NAMES = ['PriceIncrease1', 'PriceIncrease2'];

/**
 * DELETE /api/test-data — Remove testing data by deleting the two test clocks (PriceIncrease1, PriceIncrease2).
 * Deleting a test clock also removes its associated customers and subscriptions.
 */
export async function DELETE() {
  try {
    const stripe = getStripe();
    const clocksToDelete: string[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const list = await stripe.testHelpers.testClocks.list({
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });
      for (const clock of list.data) {
        if (clock.name && TEST_CLOCK_NAMES.includes(clock.name)) {
          clocksToDelete.push(clock.id);
        }
      }
      hasMore = list.has_more;
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id;
      else hasMore = false;
    }

    for (const id of clocksToDelete) {
      await stripe.testHelpers.testClocks.del(id);
    }

    return NextResponse.json({
      data: {
        message: `Testing data removed. Deleted ${clocksToDelete.length} test clock(s).`,
        deleted: clocksToDelete,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove test data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
