import Router from 'koa-router';

import authRouter from './auth';
import userRouter from './user';
import productsRouter from './user';
import paymentsRouter from './buy';
import webhooksRoute from './webhooks';

const router = new Router();

import '../middleware/passport';

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

router.use('/auth', authRouter.routes(), authRouter.allowedMethods());
router.use('/user', userRouter.routes(), userRouter.allowedMethods());
router.use('/products', productsRouter.routes(), productsRouter.allowedMethods());
router.use('/buy', paymentsRouter.routes(), paymentsRouter.allowedMethods());
router.use('/webhooks', webhooksRoute.routes(), webhooksRoute.allowedMethods());

export default router;
