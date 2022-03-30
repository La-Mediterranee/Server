// import { runAsync } from 'src/utils/helpers';
// import { stripe } from '@config/stripe';
// import { db } from '@config/firebase';

import { db } from '../config/firebase.js';
import { stripe } from '../config/stripe.js';

import type { Stripe } from 'stripe';
import type { FastifyPluginAsync } from 'fastify';
import type { DocumentData } from 'firebase-admin/firestore';

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
		readonly toppingOptionID: ID[]; //ID |
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

			return {
				clientSecret: paymentIntent.client_secret,
				amount: paymentIntent.amount,
			};
		} catch (error) {
			console.error(error);
		}
	});
};

export default router;

type BatchRead = (
	| FirebaseFirestore.DocumentReference<DocumentData>
	| FirebaseFirestore.ReadOptions
)[];

const menuitemsRef = db.collection('product'); //menuitems
const groceriesRef = db.collection('groceries');
const toppingsRef = db.collection('toppings');

async function calculateCharge(items: CartItem[]): Promise<number> {
	const table: Record<
		ICartItem['categoryType'],
		(CartGroceryItem | CartMenuItem)[]
	> = {
		grocery: [],
		menuitem: [],
	};

	for (const item of items) {
		table[item.categoryType].push(item);
	}

	const groceries = <CartGroceryItem[]>table.grocery; // new Array<CartGroceryItem>();
	const menuitems = <CartMenuItem[]>table.menuitem; // new Array<CartMenuItem>();

	const groceryDocRefs: BatchRead = groceries.map((grocery) =>
		groceriesRef.doc(grocery.ID)
	);
	const menuitemDocRefs: BatchRead = menuitems.map((menuitem) =>
		menuitemsRef.doc(menuitem.ID)
	);
	const toppingsDocRefs: BatchRead = [];
	const toppingMasks: string[] = [];

	for (const item of menuitems) {
		item.selectedToppings?.forEach(({ toppingID, toppingOptionID }) => {
			toppingsDocRefs.push(toppingsRef.doc(toppingID));
			toppingOptionID.forEach((option) =>
				toppingMasks.push(`options.${option}.price`)
			);
		});
	}

	groceryDocRefs.push({ fieldMask: ['price'] });
	menuitemDocRefs.push({ fieldMask: ['price', 'salesPrice'] });
	toppingsDocRefs.push({ fieldMask: toppingMasks });

	const groceryPromises = db.getAll(...groceryDocRefs); //db.getAll.apply(db, groceryDocRefs)
	const menuitemPromises = db.getAll(...menuitemDocRefs);
	const toppingsPromises = db.getAll(...toppingsDocRefs);

	const res = await Promise.allSettled([
		groceryPromises,
		menuitemPromises,
		toppingsPromises,
	]);

	const s = [
		new Map<ID, unknown>(),
		new Map<ID, { price: number; salesPrice?: number }>(),
		new Map<ID, { options: Record<string, { price: number }> }>(),
	];

	res.forEach((r, i) => {
		r.status === 'fulfilled'
			? r.value.forEach((e) => s[i].set(e.id, e.data()))
			: r.reason;
	});

	s.forEach((r) => console.debug(r));

	let itemsSum = 0;

	(<Map<ID, unknown>>s[0]).forEach((item, id) => (itemsSum += 0));

	(<Map<ID, { price: number; salesPrice?: number }>>s[1]).forEach(
		(item, id) => (itemsSum += item.salesPrice || item.price)
	);

	(<Map<ID, { options: Record<string, { price: number }> }>>s[2]).forEach(
		(item, id) =>
			(itemsSum += Object.values(item.options).reduce(
				(prev, option) => prev + option.price,
				0
			))
	);

	return itemsSum;
}

/**
 * Create a Payment Intent with a specific amount
 */
async function createPaymentIntent(
	amount: number
): Promise<Stripe.Response<Stripe.PaymentIntent>> {
	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: 'eur',
		automatic_payment_methods: {
			enabled: true,
		},
		// receipt_email: 'hello@fireship.io',
	});

	// paymentIntent.status;

	return paymentIntent;
}

async function chargeCustomer(customerId: string, amount: number) {
	// Lookup the payment methods available for the customer
	const paymentMethods = await stripe.paymentMethods.list({
		customer: customerId,
		type: 'card',
	});
	// Charge the customer and payment method immediately
	const paymentIntent = await stripe.paymentIntents.create({
		amount,
		currency: 'eur',
		customer: customerId,
		payment_method: paymentMethods.data[0].id,
		off_session: true,
		confirm: true,
	});

	if (paymentIntent.status === 'succeeded') {
		console.log('✅ Successfully charged card off session');
	}
}
