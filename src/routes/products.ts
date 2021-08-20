import Router from 'koa-router';
import multer from '@koa/multer';
import { extname } from 'path';

import { CDN_URL } from '@utils/consts';
import { runAsync } from '@utils/helpers';
import { stripe } from '@config/stripe';
import { bucket, db } from '@config/firebase';

import type { Context } from 'koa';

interface Product {
	name: string;
	price: number;
	image: {
		src: string;
		alt?: string;
	};
}

interface UploadProduct {
	name: string;
	price: number;
	image: string;
	category: string;
}

interface UploadImage {
	file: multer.File;
	name: string;
	metadata?: Object;
	type?: string;
}

const maxSize = 5 * 1024 * 1024;
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: maxSize
	}
});

class ProductController {
	static readonly categories = db.collection('product-categories');
	// static readonly categories = db.collection('products');
}

const categories = db.collection('product-categories');

const router = new Router({
	strict: true
});

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

router.post(
	'/',
	upload.single('image') as any,
	runAsync(async (ctx) => {
		if (!ctx.request.file) {
			ctx.body = { message: 'Please upload a file!' };
			ctx.status = 400;
			return;
		}
		ctx.body = await createProduct(ctx);
	})
);

router.post('/categories', async (ctx) => {
	//
	const data = {};
	db.collection('products').doc(``).set(data, { merge: true });
});

router.delete('/:product', async (ctx) => {
	const product = ctx.params.product;
	// delte from database and delte image from storage
});

export default router;

async function createProduct(ctx: Context | Router.IRouterContext) {
	const product = (ctx.body as any).product as UploadProduct;
	const file = ctx.request.file;
	const extension = extname(file.originalname);

	const image = await uploadImage({
		name: `${product.name}${extension}`, //ctx.request.file.originalname
		file: file
	});

	const upload: Product = {
		name: product.name,
		price: product.price,
		image: {
			src: image.cdnUrl || image.url
		}
	};

	await db.collection('products').doc(`${product.category}`).collection('products').add(upload);
}

async function getProducts() {
	return stripe.products.list();
}

async function getProduct(id: string) {}

async function getStripeProduct(id: string) {
	return stripe.products.retrieve(id);
}

async function createStripeProduct(product: UploadProduct) {
	try {
		const productResponse = await stripe.products.create({
			name: product.name,
			images: [image.cdnUrl || image.url],
			type: 'good'
		});

		const price = stripe.prices.create({
			currency: 'eur',
			unit_amount: product.price,
			product: productResponse.id
		});
	} catch (error) {}
}

function uploadImage({ file, name, type, metadata = {} }: UploadImage): Promise<{
	message: string;
	url: string;
	cdnUrl?: string;
}> {
	const blob = bucket.file(name);

	const blobStream = blob.createWriteStream({
		metadata: {
			contentType: type || file.mimetype,
			cacheControl: {
				maxAge: 9999999
			},
			// alt,
			...metadata
		},
		gzip: true,
		public: true,
		contentType: type || file.mimetype,
		resumable: false
	});

	blobStream.end(file.buffer);

	const url = `${CDN_URL}/images/${name}`;

	return new Promise((resolve, reject) => {
		blobStream.on('error', (err) => {
			reject(err.message);
		});

		blobStream.on('finish', async () => {
			// Create URL for directly file access via HTTP.
			const publicUrl = `https://storage.googleapis.com/${bucket.name}/${name}`;
			const cdnUrl = CDN_URL ? `https://${CDN_URL}/images/${blob.name}` : undefined;

			resolve({
				message: 'Uploaded the file successfully: ' + name,
				url: publicUrl,
				cdnUrl
			});
			// return {
			// 	message: 'Uploaded the file successfully: ' + file.originalname,
			// 	url: publicUrl
			// };
		});
	});
}
