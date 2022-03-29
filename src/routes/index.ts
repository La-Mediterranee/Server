import me from './me.js';
import auth from './auth.js';
import products from './products.js';
import payments from './buy.js';
import webhooks from './webhooks.js';

import type { FastifyPluginAsync } from 'fastify';

export const routes: FastifyPluginAsync = async (app) => {
	app.register(me, { prefix: '/me' });
	app.register(auth, { prefix: '/auth' });
	app.register(payments, { prefix: '/buy' });
	app.register(products, { prefix: '/products' });
	app.register(webhooks, { prefix: '/webhooks' });
	app.get('/test', () => {
		throw app.httpErrors.notImplemented(`Provider not supported`);
	});
};

export default routes;
