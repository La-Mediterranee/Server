import * as crypto from 'node:crypto';

//@ts-ignore
import { default as Router } from 'koa-router';

import { faker } from '@faker-js/faker';

import { db } from '../config/firebase.js';
import { runAsync } from '../utils/helpers.js';

import type { FastifyPluginAsync } from 'fastify';

import type { Product, Topping } from './products.types';

class ProductController {
	static readonly categories = db.collection('product-categories');
	// static readonly categories = db.collection('products');
}

const router = new Router();

export const productsRouter: FastifyPluginAsync = async (app, opts) => {
	app.get('/', async () => {
		return await getProducts();
	});

	app.get<{
		Params: { product: string };
	}>('/:product', async (req) => {
		const product = req.params.product;
		return await getProduct(product);
	});

	app.get('/categories', async (req) => {
		return db.collection('products').get();
	});

	app.get<{
		Params: { category: string };
	}>('/categories/:category', async (ctx) => {
		//
		const category = ctx.params.category;
		return db.collection('products').doc(category).get();
	});
};

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
			const toppings = i % 2 === 0 ? createToppings() : [];
			return {
				ID: crypto.randomUUID(),
				name: faker.commerce.productName(),
				price: Number(faker.commerce.price(1, 20, 2)),
				image: {
					src: `${faker.image.imageUrl(undefined, undefined, 'food', true)}`
					// alt: 'Food product',
				},
				categories: Array(randomIntFromInterval(1, 3)).map((v) =>
					faker.commerce.department()
				),
				description: faker.commerce.productDescription(),
				toppings: toppings,
				variations: {
					toppings: toppings
				}
			};
		});

	return products;
}

function createToppings(): Topping[] {
	return [createTopping('Sauce'), createTopping('Beilagen'), createTopping('Extra Beilagen', 0)];
}

function createTopping(name: string, qtyMin: number = 1): Topping {
	return {
		ID: crypto.randomUUID(),
		name,
		qtyMin,
		qtyMax: 5,
		options: [
			{
				ID: crypto.randomUUID(),
				name: 'Mais',
				desc: '',
				price: 0
			}
		]
	};
}

async function getProduct(id: string): Promise<Product> {
	return {
		ID: id,
		name: 'Hamburger',
		description: '',
		price: 4.5,
		categories: ['burger'],
		image: { src: '/burger.webp', alt: 'Bild von einem Burger' },
		toppings: createToppings(),
		variations: {
			toppings: createToppings()
		}
	};
}

function randomIntFromInterval(min: number, max: number) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min);
}
