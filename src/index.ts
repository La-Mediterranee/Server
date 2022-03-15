import fetch from 'node-fetch';
import Fastify from 'fastify';
import fastifyAuth from 'fastify-auth';
import fastifyCors from 'fastify-cors';
import fastifySensible from 'fastify-sensible';

import { pathToFileURL } from 'node:url';
// import { createServer } from 'node:https';

import { routes } from './routes/index.js';
import { NODE_ENV, PORT } from './utils/consts.js';

//@ts-ignore
globalThis.fetch = fetch;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}

async function main() {
	const fastify = Fastify({
		logger: {
			prettyPrint: NODE_ENV === 'development' && {
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname'
			}
		},
		trustProxy: true
	});

	fastify.register(fastifyCors, {});
	fastify.register(fastifySensible);
	fastify.register(fastifyAuth);
	fastify.register(routes, { prefix: 'v1' });

	try {
		const address = await fastify.listen(+PORT);
		console.log(`Server is now listening on ${address}`);
	} catch (err) {
		fastify.log.error(err);
		closeGracefully();
	}

	async function closeGracefully(signal?: NodeJS.Signals) {
		console.log(`=> Received signal to terminate: ${signal}`);

		await fastify.close();

		// app.removeAllListeners();
		// await db.close() if we have a db connection in this app
		// await other things we should cleanup nicely
		process.exit(0);
	}

	process.on('SIGINT', closeGracefully);
	process.on('SIGTERM', closeGracefully);
}
