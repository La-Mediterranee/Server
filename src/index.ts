import Koa from 'koa';
import json from 'koa-json';
import Logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import session from 'koa-session';
import cors from '@koa/cors';

// import { createServer } from 'https';

import router from './routes';

const app = new Koa();

app.use(cors());
app.use(json());
app.use(bodyParser());
app.use(async (_, next) => {
	try {
		await next();
	} catch (error) {
		const err = error as any;
		err.expose = true;
		err.status = err.statusCode || err.status || 500;
		throw err;
	}
});

app.use(Logger()).use(router.routes()).use(router.allowedMethods());

app.listen(+process.env.PORT, undefined, undefined, () => {
	console.log('listening');
});

// createServer(app.callback()).listen(5000);
async function closeGracefully(signal: NodeJS.Signals) {
	console.log(`=> Received signal to terminate: ${signal}`);

	app.removeAllListeners();
	// await db.close() if we have a db connection in this app
	// await other things we should cleanup nicely
	process.exit();
}

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

// const CONFIG: Partial<session.opts> = {
// 	key: 'koa.sess' /** (string) cookie key (default is koa.sess) */,
// 	/** (number || 'session') maxAge in ms (default is 1 days) */
// 	/** 'session' will result in a cookie that expires when session/browser is closed */
// 	/** Warning: If a session cookie is stolen, this cookie will never expire */
// 	maxAge: 86400000,
// 	// autoCommit: true /** (boolean) automatically commit headers (default true) */,
// 	overwrite: true /** (boolean) can overwrite or not (default true) */,
// 	httpOnly: true /** (boolean) httpOnly or not (default true) */,
// 	signed: true /** (boolean) signed or not (default true) */,
// 	rolling:
// 		false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
// 	renew: false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
// 	secure: true /** (boolean) secure cookie*/
// 	// sameSite: undefined /** (string) session cookie sameSite options (default null, don't set it) */
// };
// app.use(session(CONFIG, app));
