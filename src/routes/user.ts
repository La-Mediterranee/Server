import Router from 'koa-router';

import { auth, db } from '../config/firebase.js';
import { stripe } from '../config/stripe.js';
import { runAsync, validateUser } from '../utils/helpers.js';

import type Stripe from 'stripe';

const router = new Router();

/**
 * Retrieve all paymentmethods attached to customer
 */
router.get(
	'/wallet',
	runAsync(async (ctx) => {
		const customer = validateUser(ctx);
		const wallet = await listPaymentMethods(customer.uid);
		ctx.body = wallet;
	})
);

/**
 * Save customer paymentmethod
 */
router.post(
	'/wallet',
	runAsync(async (ctx) => {
		const customer = validateUser(ctx);
		const setupIntent = await createSetupIntent(customer.uid);
		ctx.body = setupIntent;
	})
);

export default router;

/**
 * Creates a SetupIntent used to save a credit card for later use
 */
export async function createSetupIntent(customerId: string) {
	const customer = await getOrCreateCustomer(customerId);

	return stripe.setupIntents.create({
		customer: customer.id,
	});
}

/**
 * Returns all payment sources associated to the user
 */
export async function listPaymentMethods(userId: string) {
	const customer = await getOrCreateCustomer(userId);

	const methods = await Promise.all([
		stripe.paymentMethods.list({
			customer: customer.id,
			type: 'sofort',
		}),
		stripe.paymentMethods.list({
			customer: customer.id,
			type: 'card',
		}),
	]).then((r) => r.map((s) => s.data));

	return [
		{
			type: 'sofort',
			data: methods[0],
		},
		{
			type: 'cards',
			data: methods[1],
		},
	];
}

/**
 * Gets the exsiting Stripe customer or creates a new record
 */
export async function getOrCreateCustomer(
	userId: string,
	params?: Stripe.CustomerCreateParams
) {
	const userRecord = await auth.getUser(userId);
	const email = userRecord.email;
	const stripeCustomerId =
		userRecord.customClaims &&
		(userRecord.customClaims['stripeCustomerId'] as string);

	// If missing customerID, create it
	if (!stripeCustomerId) {
		// CREATE new customer
		const customer = await stripe.customers.create({
			email,
			metadata: {
				firebaseUID: userId,
			},
			...params,
		});
		await auth.setCustomUserClaims(userId, {
			stripeCustomerId: customer.id,
		});
		return customer;
	} else {
		return (await stripe.customers.retrieve(
			stripeCustomerId
		)) as Stripe.Customer;
	}
}

// export async function getOrCreateCustomer(
// 	customerId: string,
// 	params?: Stripe.CustomerCreateParams
// ) {
// 	const userSnapshot = await db.collection('customers').doc(customerId).get();

// 	const { email, stripeCustomerId } = userSnapshot.data() as firestore.DocumentData;

// 	if (!stripeCustomerId) {
// 		const customer = await stripe.customers.create({
// 			email,
// 			metadata: {
// 				firebaseUID: customerId
// 			},
// 			...params
// 		});

// 		await userSnapshot.ref.update({ stripCustomerId: customer.id });

// 		return customer;
// 	}

// 	return (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer;
// }
