// import { runAsync } from 'src/utils/helpers';
// import { stripe } from '@config/stripe';
// import { db } from '@config/firebase';
import { DocumentData, FieldPath, QuerySnapshot } from 'firebase-admin/firestore';

import { db } from '../config/firebase.js';
import { stripe } from '../config/stripe.js';
import { sliceIntoChunks } from '../utils/helpers.js';

import type { Stripe } from 'stripe';
import type { FastifyPluginAsync } from 'fastify';

type ID = string;

interface ICartItem {
	readonly ID: ID;
	readonly name: string;
	readonly categoryType: 'menuitem' | 'grocery';
	readonly quantity: number;
}

interface CartMenuItem extends ICartItem {
	readonly categoryType: 'menuitem';
	readonly selectedToppings?: {
		readonly toppingID: ID;
		readonly toppingOptionID: ID | ID[];
	}[];
}

interface CartGroceryItem extends ICartItem {
	readonly categoryType: 'grocery';
}

type CartItem = CartMenuItem | CartGroceryItem;

interface Payment {
	items: CartItem[];
}

export const router: FastifyPluginAsync = async (app, opts) => {
	app.post<{
		Body: CartItem[];
	}>('/create-payment-intent', async (req) => {
		const body = req.body;
		try {
			const amount = await calculateCharge(body);
			const paymentIntent = await createPaymentIntent(amount || 20000);

			// return {
			// 	clientSecret: paymentIntent.client_secret
			// };
			return paymentIntent;
		} catch (error) {
			console.error(error);
		}
	});
};

export default router;

const toppingsRef = db.collection('toppings');

function getToppingOptionPrice(toppingID: ID, toppingOptionID: ID | ID[]) {
	const fields =
		typeof toppingOptionID === 'string'
			? [`options.${toppingOptionID}.price`]
			: toppingOptionID.map((option) => `options.${option}.price`);

	return toppingsRef
		.select(...fields)
		.where(FieldPath.documentId(), '==', toppingID)
		.get();
}

type BatchRead = (
	| FirebaseFirestore.DocumentReference<DocumentData>
	| FirebaseFirestore.ReadOptions
)[];

async function calculateCharge(items: CartItem[]): Promise<number> {
	const groceries = new Array<CartGroceryItem>();
	const menuitems = new Array<CartMenuItem>();

	for (const item of items) {
		item.categoryType === 'grocery' ? groceries.push(item) : menuitems.push(item);
	}

	const menuitemsRef = db.collection('product'); //menuitems
	const groceriesRef = db.collection('groceries');

	const groceryDocRefs: BatchRead = groceries.map((grocery) => groceriesRef.doc(grocery.ID));
	const groceryPromises = db.getAll.apply(
		null,
		groceryDocRefs.concat([{ fieldMask: ['price'] }])
	);

	const menuitemDocRefs: BatchRead = menuitems.map((menuitem) => menuitemsRef.doc(menuitem.ID));
	const menuitemPromises = db.getAll.apply(
		null,
		menuitemDocRefs.concat([{ fieldMask: ['price', 'salesPrice', 'options'] }])
	);

	// const groceryPromises = sliceIntoChunks(groceries).map((chunk) => {
	// 	const ids = Array.from(chunk, (item) => item.ID);
	// 	return groceriesRef.select('price').where(FieldPath.documentId(), 'in', ids).get();
	// });

	// const menuitemPromises = sliceIntoChunks(menuitems).map((chunk) => {
	// 	const ids = Array.from(chunk, (item) => item.ID);
	// 	return menuitemsRef
	// 		.select('price', 'salesPrice', 'options')
	// 		.where(FieldPath.documentId(), 'in', ids)
	// 		.get();
	// });

	const toppingsPromises = menuitems
		.map((item) => {
			return (
				item.selectedToppings
					?.map(({ toppingID, toppingOptionID }) => {
						return getToppingOptionPrice(toppingID, toppingOptionID);
					})
					.flat(1) ?? []
			);
		})
		.flat(1);

	const res = await Promise.allSettled(
		([] as Promise<FirebaseFirestore.DocumentSnapshot<DocumentData>[]>[]).concat(
			groceryPromises,
			menuitemPromises
			// Promise.all(toppingsPromises)
		)
	);

	res.forEach((e) => {
		e.status === 'fulfilled' ? e.value.forEach((e) => {}) : 'error';
	});

	return 0;
}

/**
 * Create a Payment Intent with a specific amount
 */
async function createPaymentIntent(amount: number): Promise<Stripe.Response<Stripe.PaymentIntent>> {
	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: 'eur',
		automatic_payment_methods: {
			enabled: true
		}
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
