import { stripe } from '../config/stripe.js';
import { STRIPE_WEBHOOK_SECRET } from '../utils/consts.js';

import type { Stripe } from 'stripe';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

interface StripeRequest {
	Headers: {
		'stripe-signature': string;
	};
	Body: {
		raw: Buffer;
		json: any;
	};
}

export const router: FastifyPluginAsync = async (app) => {
	// app.decorateRequest('rawBody', undefined);
	app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_, payload, done) => {
		try {
			done(null, {
				raw: payload,
				json: JSON.parse(payload.toString())
			});
		} catch (err) {
			return err;
		}
	});

	/**
	 * Validate the stripe webhook secret, then call the handler for the event type
	 */
	app.post<StripeRequest>('/stripe', async (req, res) => {
		return handleStripeWebhook(req);
	});

	async function handleStripeWebhook<T extends StripeRequest>(req: FastifyRequest<T>) {
		const sig = req.headers['stripe-signature'];
		const event = stripe.webhooks.constructEvent(req.body.raw, sig, STRIPE_WEBHOOK_SECRET);

		try {
			await webhookHandlers[event.type](event.data.object);
			return {
				received: true
			};
			// res.send({ received: true });
		} catch (err) {
			console.error(err);
			throw app.httpErrors.badRequest(`Webhook Error: ${(err as Error).message}`);
		}
	}
};

export default router;

/**
 * Business logic for specific webhook event types
 */
const webhookHandlers = {
	'payment_intent.succeeded': async (_data: Stripe.PaymentIntent) => {
		// Add your business logic here
	},
	'payment_intent.payment_failed': async (_data: Stripe.PaymentIntent) => {
		// Add your business logic here
	}
};
