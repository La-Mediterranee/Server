import faker from 'faker';
import Router from 'koa-router';

import * as crypto from 'node:crypto';

import { CDN_URL } from '@utils/consts';
import { runAsync } from '@utils/helpers';
import { stripe } from '@config/stripe';
import { db } from '@config/firebase';

type SKU = string;
type ID = string;

export type Variations = DeepReadonly<{
	toppings?: string[];
}>;

export interface Image {
	readonly src: string;
	readonly alt?: string;
}

interface Product {
	readonly ID: ID;
	readonly sku?: SKU;
	readonly name: string;
	readonly description: string;
	readonly price: number;
	readonly image: Image;
	readonly categories: readonly string[];
	readonly variations?: Variations | null;
	readonly rating?: {
		readonly value: number;
		readonly count: number;
	};
}

class ProductController {
	static readonly categories = db.collection('product-categories');
	// static readonly categories = db.collection('products');
}

const router = new Router();

export default router;

router.get(
	'/',
	runAsync(async (ctx) => {
		ctx.body = await getProducts();
	})
);

router.get(
	'/:product',
	runAsync(async (ctx) => {
		const product = ctx.params.product as string;
		ctx.body = await getProduct(product);
	})
);

router.get('/categories', async (ctx) => {
	const category = ctx.params.category as string;
	const data = {};
	ctx.body = db.collection('products').get();
});

router.get('/categories/:category', async (ctx) => {
	//
	const category = ctx.params.category as string;
	const data = {};
	ctx.body = db.collection('products').doc(category).get();
});

async function getProducts() {
	const products: Product[] = Array(10)
		.fill(0)
		.map((_, i) => {
			return {
				ID: crypto.randomUUID(),
				name: faker.commerce.productName(),
				price: Number(faker.commerce.price(1, 20, 2)),
				image: {
					src: `${faker.image.imageUrl(undefined, undefined, 'food', true)}`,
					alt: 'Food product'
				},
				categories: Array(randomIntFromInterval(1, 3)).map((v) =>
					faker.commerce.department()
				),
				description: faker.commerce.productDescription(),
				variations:
					i % 2 === 0
						? {
								toppings: ['Beilagen', 'Saucen']
						  }
						: null
			};
		});

	return products;
}

async function getProduct(id: string) {}

function randomIntFromInterval(min: number, max: number) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min);
}
