import * as Router from 'koa-router';

// import { runAsync } from 'src/utils/helpers';
// import { stripe } from '@config/stripe';
// import { db } from '@config/firebase';

import { db } from '../config/firebase.js';
import { stripe } from '../config/stripe.js';
import { runAsync } from '../utils/helpers.js';

import type { Stripe } from 'stripe';
import type { FastifyPluginAsync } from 'fastify';

type SKU = string;

interface CartItem {
	readonly sku?: SKU;
	readonly name: string;
	readonly quantity: number;
}

interface Payment {
	items: CartItem[];
}

export const paymentsRouter: FastifyPluginAsync = async (app, opts) => {
	app.post<{
		Body: Payment;
	}>('/create-payment-intent', async (req) => {
		const body = req.body;
		const amount = await calculateCharge(body.items);
		const paymentIntent = await createPaymentIntent(amount);
		return {
			clientSecret: paymentIntent.client_secret
		};
	});
};

const router = new Router();

router.post(
	'/create-payment-intent',
	runAsync(async (ctx) => {
		const body = ctx.body as Payment;
		const amount = await calculateCharge(body.items);
		const paymentIntent = await createPaymentIntent(amount);
		ctx.body = {
			clientSecret: paymentIntent.client_secret
		};
	})
);

export default router;

async function calculateCharge(items: CartItem[]): Promise<number> {
	const promises = items.map((item) => {
		return stripe.prices.list({
			product: item.sku
		});

		// return db.collectionGroup('products').where('', '==', item.sku).get();
	});

	await Promise.all(promises);

	db.collectionGroup('products');
	return 0;
}

/**
 * Create a Payment Intent with a specific amount
 */
async function createPaymentIntent(amount: number): Promise<Stripe.Response<Stripe.PaymentIntent>> {
	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: 'eur'
		// receipt_email: 'hello@fireship.io',
	});

	// paymentIntent.status;

	return paymentIntent;
}

async function chargeCustomer(customerId: string, amount: number) {
	// Lookup the payment methods available for the customer
	const paymentMethods = await stripe.paymentMethods.list({
		customer: customerId,
		type: 'card'
	});
	// Charge the customer and payment method immediately
	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: 'eur',
		customer: customerId,
		payment_method: paymentMethods.data[0].id,
		off_session: true,
		confirm: true
	});

	if (paymentIntent.status === 'succeeded') {
		console.log('✅ Successfully charged card off session');
	}
}
