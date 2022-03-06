import Router from 'koa-router';

import auth, { authRouter } from './auth.js';
import user from './user.js';
import products, { productsRouter } from './products.js';
import payments from './buy.js';
import webhooks from './webhooks.js';

import '../middleware/passport.js';

import type { FastifyPluginAsync } from 'fastify';

// // Sessions
// import session from 'koa-session';
// app.keys = ['secret']
// app.use(session({}, app))
// app.use(passport.session())

// Sessions for specific routes
// const sessionMiddleware = session({
//     //session configurations
// });
// function sessionHandler(ctx, next) { sessionMiddleware(ctx, next); }

export const routes: FastifyPluginAsync = async (app) => {
	app.register(authRouter, { prefix: '/auth' });
	app.register(() => {}, { prefix: '/user' });
	app.register(() => {}, { prefix: '/buy' });
	app.register(productsRouter, { prefix: '/products' });
	app.register(() => {}, { prefix: '/webhooks' });
};

const router = new Router();

router.use('/auth', auth.routes(), auth.allowedMethods());
router.use('/user', user.routes(), user.allowedMethods());
router.use('/buy', payments.routes(), payments.allowedMethods());
router.use('/products', products.routes(), products.allowedMethods());
router.use('/webhooks', webhooks.routes(), webhooks.allowedMethods());

export default router;
