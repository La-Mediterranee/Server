import fetch from 'node-fetch';
import Fastify from 'fastify';
import fastifyAuth from '@fastify/auth';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';

import * as path from 'node:path';

import { platform } from 'node:os';
import { dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
// import { createServer } from 'node:https';

import { routes } from './routes/index.js';
import { NODE_ENV, PORT } from './utils/consts.js';
import PinoPretty from 'pino-pretty';

//@ts-ignore
// globalThis.fetch = fetch;

Object.defineProperty(globalThis, 'fetch', {
	value: fetch,
	configurable: false,
	writable: false,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	console.debug(globalThis.fetch);
	main();
}

async function main() {
	const hasFullICU = (() => {
		try {
			const january = new Date(9e8);
			const spanish = new Intl.DateTimeFormat('es', { month: 'long' });
			return spanish.format(january) === 'enero';
		} catch (err) {
			return false;
		}
	})();

	console.log(hasFullICU);

	const fastify = Fastify({
		logger: {
			stream: PinoPretty({
				...(NODE_ENV === 'development' && {
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid, hostname',
				}),
			}),
			// transport: {
			// 	target: 'pino-pretty',
			// 	options: {
			// 		pretty
			// 	},
			// },
		},
		trustProxy: true,
		https: {
			key: readFileSync(
				path.join(
					__dirname,
					platform() === 'linux'
						? './config/server-key.windows.pem'
						: './config/server-key.osx.pem'
				)
			),
			cert: readFileSync(
				path.join(
					__dirname,
					platform() === 'linux'
						? './config/server-cert.windows.pem'
						: './config/server-cert.osx.pem'
				)
			),
		},
	});

	fastify.register(fastifyCors, {
		allowedHeaders: '*',
		origin: async (origin) => {
			if (!origin) return true;

			const hostname = new URL(origin).hostname;
			if (hostname === 'localhost') {
				//  Request from localhost will pass
				return true;
			}

			throw new Error('Not allowed');
		},
	});
	fastify.register(fastifySensible);
	fastify.register(fastifyAuth);
	fastify.register(routes, { prefix: 'v1' });

	try {
		await fastify.listen({ port: +PORT });
		// console.log(fastify.printRoutes());
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
