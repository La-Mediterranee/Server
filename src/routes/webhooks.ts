import Router from 'koa-router';

import { stripe } from '@config/stripe';
import { runAsync } from 'src/utils/helpers';
import { STRIPE_WEBHOOK_SECRET } from 'src/utils/consts';

import type { Stripe } from 'stripe';
import type { Next, Context } from 'koa';
import type { IRouterContext } from 'koa-router';
export const router = new Router({
	strict: true
});

/**
 * Stripe Webhooks
 */
router.post('/stripe', runAsync(handleStripeWebhook));

export default router;

/**
 * Business logic for specific webhook event types
 */
const webhookHandlers = {
	'payment_intent.succeeded': async (data: Stripe.PaymentIntent) => {
		// Add your business logic here
	},
	'payment_intent.payment_failed': async (data: Stripe.PaymentIntent) => {
		// Add your business logic here
	}
};

/**
 * Validate the stripe webhook secret, then call the handler for the event type
 */
async function handleStripeWebhook(ctx: Context | IRouterContext) {
	const sig = ctx.headers['stripe-signature'] as string;
	const event = stripe.webhooks.constructEvent(ctx.request.rawBody, sig, STRIPE_WEBHOOK_SECRET); // ctx['rawBody']

	try {
		await webhookHandlers[event.type](event.data.object);
		ctx.body = {
			received: true
		};
		// res.send({ received: true });
	} catch (err) {
		console.error(err);
		ctx.throw(400, `Webhook Error: ${(err as Error).message}`);
		// res.status(400).send(`Webhook Error: ${err.message}`);
	}
}
