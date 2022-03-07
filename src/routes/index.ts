//@ts-ignore
import { default as Router } from 'koa-router';

import auth, { authRouter } from './auth.js';
import user, { userRouter } from './user.js';
import products, { productsRouter } from './products.js';
import payments, { paymentsRouter } from './buy.js';
import webhooks, { webhooksRouter } from './webhooks.js';

import type { FastifyPluginAsync } from 'fastify';

export const routes: FastifyPluginAsync = async (app) => {
	app.register(authRouter, { prefix: '/auth' });
	app.register(userRouter, { prefix: '/user' });
	app.register(paymentsRouter, { prefix: '/buy' });
	app.register(productsRouter, { prefix: '/products' });
	app.register(webhooksRouter, { prefix: '/webhooks' });
	app.get('/test', () => {
		throw app.httpErrors.notImplemented(`Provider not supported`);
	});
};

const router = new Router();

router.use('/auth', auth.routes(), auth.allowedMethods());
router.use('/user', user.routes(), user.allowedMethods());
router.use('/buy', payments.routes(), payments.allowedMethods());
router.use('/products', products.routes(), products.allowedMethods());
router.use('/webhooks', webhooks.routes(), webhooks.allowedMethods());

export default router;
