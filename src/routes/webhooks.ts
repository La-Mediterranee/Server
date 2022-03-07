import * as Router from 'koa-router';

import { stripe } from '../config/stripe.js';
import { runAsync } from '../utils/helpers.js';
import { STRIPE_WEBHOOK_SECRET } from '../utils/consts.js';

import type { Stripe } from 'stripe';
import type { Next, Context } from 'koa';
import type { IRouterContext } from 'koa-router';
import type { FastifyPluginAsync } from 'fastify';

export const router = new Router();

export const webhooksRouter: FastifyPluginAsync = async (app) => {
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

	app.post<{
		Headers: {
			'stripe-signature': string;
		};
		Body: {
			raw: Buffer;
		};
	}>('/stripe', async (req, res) => {
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
			res.code(400);
			throw `Webhook Error: ${(err as Error).message}`;
		}
	});
};

/**
 * Stripe Webhooks
 */
router.post('/stripe', runAsync(handleStripeWebhook));

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
