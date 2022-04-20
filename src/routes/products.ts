import * as crypto from 'node:crypto';

import { faker } from '@faker-js/faker';
import { FieldPath, Firestore } from 'firebase-admin/firestore';

import drinks from '../data/drinks.js';

import { dev } from '../utils/helpers.js';
import { db } from '../config/firebase.js';
import { allergenKeys } from '../allergens.js';

import type { FastifyPluginAsync } from 'fastify';
import type { Product, Topping } from './products.types';

function createTopping(name: string, qtyMin: number = 1): Topping {
	return {
		ID: 'jqNrLNUjqmyoRbBrG4K7',
		name,
		qtyMin,
		qtyMax: 5,
		options: [
			{
				ID: 'greek-salad',
				name: 'Greek Salad',
				desc: '',
				price: 0
			}
		]
	};
}

function createSaladTopping(qtyMin: number = 1): Topping {
	return {
		ID: 'jqNrLNUjqmyoRbBrG2K7',
		name: 'Salad',
		qtyMin,
		qtyMax: 1,
		options: [
			{
				ID: 'greek-salad',
				name: 'Greek Salad',
				desc: '',
				price: 50
			}
		]
	};
}
function createSauceTopping(qtyMin: number = 1): Topping {
	return {
		ID: 'kiHoetrndsBM3ceKu8Q1',
		name: 'Sauce',
		qtyMin,
		qtyMax: 2,
		options: [
			{
				ID: 'taratar',
				name: 'Tartar',
				desc: '',
				price: 50
			},
			{
				ID: 'chilli',
				name: 'Chilli',
				desc: '',
				price: 0
			}
		]
	};
}

function createToppings(): Topping[] {
	// return [createTopping('Sauce'), createTopping('Beilagen'), createTopping('Extra Beilagen', 0)];

	return [createSaladTopping(), createSauceTopping(), createTopping('Extra Beilagen', 0)];
}

function createAllergens() {
	return allergenKeys
		.sort(() => Math.random() - Math.random())
		.slice(0, Math.round(Math.random() * (allergenKeys.length - 1)));
}

class ProductController {
	static readonly categories = db.collection('product-categories');

	async getCategories() {
		return db.collection('categories').get();
	}

	async getMenuFoodCategories() {
		return db.collection('categories').where('type', '==', 'menuFood').get();
	}

	async getProducts(): Promise<Product[]> {
		const products: Product[] = Array(10)
			.fill(0)
			.map((_, i) => {
				const toppings = i % 2 === 0 ? createToppings() : [];
				return {
					ID: crypto.randomUUID(),
					name: faker.commerce.productName(),
					price: Number(faker.commerce.price(50, 3500, 2)),
					image: {
						src: '/burger.webp', // `${faker.image.imageUrl(250, 150, 'food', true, true)}`,
						// alt: 'Food product',
						height: 150,
						width: 250
					},
					categories: Array(randomIntFromInterval(1, 3)).map((v) =>
						faker.commerce.department()
					),
					allergens: createAllergens(),
					desc: faker.commerce.productDescription(),
					toppings: toppings,
					variations: {
						toppings: toppings
					}
				};
			});

		return products;
	}

	async getMenuItems(): Promise<Product[]> {
		const products: Product[] = Array(10)
			.fill(0)
			.map((_, i) => {
				const toppings = i % 2 === 0 ? createToppings() : [];
				return {
					ID: crypto.randomUUID(),
					name: faker.commerce.productName(),
					price: Number(faker.commerce.price(1, 20, 2)),
					image: {
						src: `${faker.image.imageUrl(undefined, undefined, 'food', true, true)}`
						// alt: 'Food product',
					},
					categories: Array(randomIntFromInterval(1, 3)).map((v) =>
						faker.commerce.department()
					),
					allergens: createAllergens(),
					desc: faker.commerce.productDescription(),
					toppings: toppings,
					variations: {
						toppings: toppings
					}
				};
			});

		return products;
	}

	async getProduct(id: string): Promise<Product> {
		return {
			ID: id,
			name: 'Hamburger',
			desc: '',
			price: 4.5,
			categories: ['burger'],
			image: { src: '/burger.webp', alt: 'Bild von einem Burger' },
			toppings: createToppings(),
			allergens: createAllergens(),
			variations: {
				toppings: createToppings()
			}
		};
	}

	async getMenuItem(id: string): Promise<Omit<Product, 'variations'>> {
		return {
			ID: id,
			name: 'Hamburger',
			desc: '',
			price: 4.5,
			categories: ['burger'],
			image: { src: '/burger.webp', alt: 'Bild von einem Burger' },
			allergens: createAllergens(),
			toppings: createToppings()
		};
	}

	async getDrinks() {
		if (dev) return drinks;
		return db.collection('menu-items').where('type', '==', 'drink').get();
	}
	// static readonly categories = db.collection('products');
}

const controller = new ProductController();

export const router: FastifyPluginAsync = async (app, opts) => {
	app.get('/', async () => {
		// .where(FieldPath.documentId(), 'in', ['rQTnF1yWUkWR8En6q2RA'])
		return await controller.getProducts();
	});

	app.get<{
		Params: { product: string };
		Querystring: { type: 'menuitem' | 'grocery' };
	}>('/:product', async (req) => {
		const product = req.params.product;
		const type = req.query.type;

		switch (type) {
			case 'menuitem':
				return await controller.getMenuItem(product);
			case 'grocery':
				return await controller.getProduct(product);
		}

		return app.httpErrors.unprocessableEntity(
			`Type query must be either 'menuitem' or 'grocery'`
		);
	});

	app.get('/drinks', async (req) => {
		return controller.getDrinks();
	});

	app.get('/categories', async (req) => {
		return db.collection('categories').get();
	});

	app.get<{
		Params: { category: string };
	}>('/categories/:category', async (ctx) => {
		//
		const category = ctx.params.category;
		return db.collection('products').where('categories', 'array-contains', category);
	});
};

export default router;

function randomIntFromInterval(min: number, max: number) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min);
}
