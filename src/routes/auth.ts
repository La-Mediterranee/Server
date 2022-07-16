import * as path from 'node:path';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';

import { readFileSync } from 'node:fs';
import { Strategy as DiscordStrategy } from 'passport-discord';

import { discord } from '../utils/consts.js';
import { auth, db } from '../config/firebase.js';
import { signInFirebaseTemplateWithPostMessage } from '../utils/helpers.js';

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
// import type { auth } from 'firebase-admin';

interface LoginQuery {
	provider: 'discord' | 'steam' | 'firebase';
}

interface OAuthUser {
	id: string;
	provider: string;
	email: string;
	username: string;
	[key: string]: number | string | null;
}

// import '../middleware/passport.js';

export const router: FastifyPluginAsync = async (app, opts) => {
	app.register(fastifySecureSession, {
		key: readFileSync(path.join(process.cwd(), 'secret-key')),
	});

	app.register(fastifyPassport.initialize());
	app.register(fastifyPassport.secureSession());

	fastifyPassport.registerUserDeserializer(async (user, request) => {
		console.log('user', user);
		return (user as any).uid;
	});

	fastifyPassport.registerUserDeserializer(async (uid, request) => {
		console.log('uid', uid);
		return uid;
	});

	fastifyPassport.use(
		'discord',
		new DiscordStrategy(
			{
				clientID: discord.clientID,
				clientSecret: discord.clientSecret,
				callbackURL: discord.redirectURL,
				scope: discord.scopes,
			},
			async function (accessToken, refreshToken, profile, done) {
				return done(null, profile);
			}
		)
	);

	const providers = new Map<
		string,
		<T>(req: FastifyRequest, res: FastifyReply) => Promise<any>
	>([
		[
			'discord',
			async (req, res) => {
				const cb = fastifyPassport.authenticate(['discord'], {
					scope: discord.scopes,
					session: false,
				});

				// ts complaints that is doesn't have access to `this`
				// because of the typedefinition
				await cb.apply(app, [req, res]);
			},
		],
		// [
		// 	'steam',
		// 	async (_req, _res) => {
		// 		return 'not implemented right now';
		// 	}
		// ]
	]);

	// const supportedProviders = new Set(['discord']);

	interface DiscordUser extends OAuthUser {
		avatar: string | null;
		discriminator: string;
	}

	// app.get('/', async (req, res) => {
	// 	res.header('Content-type', 'text/html');
	// 	return signInFirebaseTemplateWithPostMessage('', '', '', '');
	// });

	app.get<{
		Params: { provider: string };
		Querystring: OAuthUser;
	}>(
		'/handler/:provider',
		{
			preValidation: fastifyPassport.authenticate(['discord'], {
				session: false,
			}),
		},
		async (req, res) => {
			if (!providers.has(req.params.provider)) {
				throw app.httpErrors.unprocessableEntity(
					`Selected Provider not supported.\n` +
						`Supported Providers: ${[...providers.keys()].join(
							','
						)}`
				);
			}

			const user = <any>req.user;
			let photoURL = '';
			let token = '';

			switch (req.params.provider) {
				case 'discord':
					try {
						const user = <DiscordUser>(<unknown>req.user);
						const uid = user.id;
						photoURL =
							user.avatar !== null
								? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=96x96`
								: `https://cdn.discordapp.com/embed/avatars/${user.discriminator}.png?size=96x96`;
						try {
							await auth.updateUser(uid, {
								photoURL,
								email: user.email,
								displayName: user.username,
							});
						} catch (_e) {
							if ((<any>_e).code === 'auth/user-not-found') {
								await auth.createUser({
									uid,
									photoURL,
									email: user.email,
									displayName: user.username,
								});
							}
						}

						token = await auth.createCustomToken(uid, {
							locale: user.locale,
						});
					} catch (error) {
						console.error(error);
						return new Error(`Error with Auth the handler`);
					}
					break;
			}

			res.header('Content-type', 'text/html');
			return signInFirebaseTemplateWithPostMessage(
				token,
				user.email,
				user.username,
				photoURL
			);
		}
	);

	app.get<{
		Querystring: { provider: string };
	}>('/login', async (req, res) => {
		const query = req.query;
		const provider = query.provider;

		if (!providers.has(provider)) {
			throw app.httpErrors.unprocessableEntity(
				`Selected Provider not supported.\n` +
					`Supported Providers: ${[...providers.keys()].join(',')}`
			);
		}

		return providers.get(provider)!(req, res);
	});

	app.post<{
		Body: { idToken: string; locale: string };
	}>('/session', async (req, res) => {
		const { idToken, locale } = req.body;

		try {
			const decodedIdToken = await auth.verifyIdToken(idToken);
			// Only process if the user just signed in in the last 5 minutes.
			if (
				new Date().getTime() / 1000 - decodedIdToken.auth_time >
				5 * 60
			) {
				res.code(401);
				throw 'Recent sign in required!';
			}

			await auth.setCustomUserClaims(decodedIdToken.uid, {
				locale,
			});
		} catch (error) {
			console.error(error);
		}

		const days = 14;
		const expiresIn = days * 60 * 60 * 24 * 1000;

		const sessionCookie = await auth.createSessionCookie(idToken, {
			expiresIn,
		});

		return { cookie: sessionCookie, expiresIn };
	});

	app.post<{
		Body: { uid: string; expiresIn: number };
	}>('/session/extend', async (req, res) => {
		const { expiresIn, uid } = req.body;

		const cookie = await refreshSessionCookie(uid, expiresIn);

		return cookie;
	});

	app.post<{
		Body: string;
	}>('/session/verify', async (req, res) => {
		return await auth.verifySessionCookie(req.body);
	});
};

async function refreshSessionCookie(uid: string, expiresIn: number) {
	const config = process.env.GOOGLE_API_KEY;

	const token = await auth.createCustomToken(uid);
	const res = await fetch(
		`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${config}`,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				token,
				returnSecureToken: true,
			}),
		}
	).then((r) => r.json());

	const sessionCookie = await auth.createSessionCookie(res.idToken, {
		expiresIn,
	});

	return sessionCookie;
}

// router.get('/discord', (req, res) => {
// 	const redirect = encodeURIComponent(discord.redirectURL);
// 	res.redirect(
// 		`https://discordapp.com/api/oauth2/authorize?client_id=${discord.clientID}&scope=identify&response_type=code&redirect_uri=${redirect}`
// 	);
// });

export default router;
