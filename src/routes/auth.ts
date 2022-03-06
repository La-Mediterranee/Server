import Router from 'koa-router';
import passport from 'koa-passport';
import fastifyPassport from 'fastify-passport';

import { discord } from '../utils/consts.js';
import { auth, db } from '../config/firebase.js';

import { signInFirebaseTemplateWithPostMessage } from 'src/utils/helpers';

import type { Stripe } from 'stripe';
import type { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';

// import type { auth } from 'firebase-admin';

interface LoginQuery {
	provider: 'discord' | 'steam' | 'firebase';
}

interface OAuthUser {
	id: string;
	provider: string;
	[key: string]: string;
}

const router = new Router();

export const authRouter: FastifyPluginAsync = async (app, opts) => {
	app.register(fastifyPassport.initialize());

	app.get<{
		Querystring: OAuthUser;
	}>(
		'/handler/:provider',
		{
			preValidation: fastifyPassport.authenticate(['discord'], {
				session: false,
			}),
		},
		async (req, res) => {
			try {
				const user = req.query;
				const uid = user.id;
				const token = await auth.createCustomToken(uid);
				const photoURL = !user.avatar
					? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=96x96`
					: `https://cdn.discordapp.com/embed/avatars/${user.discriminator}.png?size=96x96`;

				res.header('Content-type', 'text/html');
				return signInFirebaseTemplateWithPostMessage(
					token,
					user.email,
					user.username,
					photoURL
				);
			} catch (error) {
				console.error(error);
				return new Error(`Error with Auth the handler`);
			}
		}
	);

	app.get<{
		Querystring: { provider: string };
	}>('/login', async (res, req) => {
		const query = res.query;
		const provider = query.provider;

		switch (provider) {
			case 'discord':
				//@ts-ignore
				fastifyPassport.authenticate('discord', {
					scope: discord.scopes,
					session: false,
					state: 'discord',
				})(req, res);
				break;
			case 'steam':
				break;
			default:
				req.code(502);
				throw `Provider not supported`;
		}
	});

	app.post<{
		Body: { idToken: string; locale: string };
	}>('/session', async (req, res) => {
		const { idToken, locale } = req.body;
		const decodedIdToken = await auth.verifyIdToken(idToken);

		// Only process if the user just signed in in the last 5 minutes.
		if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
			res.code(401);
			throw 'Recent sign in required!';
		}

		await auth.setCustomUserClaims(decodedIdToken.uid, {
			locale,
		});

		const days = 14;
		const expiresIn = days * 60 * 60 * 24 * 1000;

		const sessionCookie = await auth.createSessionCookie(idToken, {
			expiresIn,
		});

		return { cookie: sessionCookie, expiresIn };
	});

	app.post<{
		Body: { idToken: string; locale: string };
	}>('/session/extend', async (req, res) => {
		const { idToken, locale } = req.body;
		const decodedIdToken = await auth.verifyIdToken(idToken);

		// Only process if the user just signed in in the last 5 minutes.
		if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
			res.code(401);
			throw 'Recent sign in required!';
		}

		await auth.setCustomUserClaims(decodedIdToken.uid, {
			locale,
		});

		const days = 14;
		const expiresIn = days * 60 * 60 * 24 * 1000;

		const sessionCookie = await auth.createSessionCookie(idToken, {
			expiresIn,
		});

		return { cookie: sessionCookie, expiresIn };
	});
};

router.use(passport.initialize() as any);

router.get(
	'/handler/:provider',
	passport.authenticate(['discord'], { session: false }),
	async (ctx) => {
		try {
			const user = ctx.query as OAuthUser;
			const uid = user.id;
			const token = await auth.createCustomToken(uid);
			const photoURL = !user.avatar
				? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=96x96`
				: `https://cdn.discordapp.com/embed/avatars/${user.discriminator}.png?size=96x96`;

			ctx.set('Content-type', 'text/html');

			ctx.body = signInFirebaseTemplateWithPostMessage(
				token,
				user.email,
				user.username,
				photoURL
			);
		} catch (error) {
			console.error(error);
			ctx.throw(500, `Error with Auth the handler`);
		}
	}
);

router.get('/login', (ctx, next) => {
	const query = ctx.query;
	const provider = query.provider;

	switch (provider) {
		case 'discord':
			passport.authenticate('discord', {
				scope: discord.scopes,
				// failureRedirect: '/auth/error',
				session: false,
				state: 'discord',
			})(ctx as any, next);
			break;
		case 'steam':
			break;
		default:
			ctx.throw(502, `Provider not supported`);
			break;
	}
});

router.post('/session', async (ctx) => {
	const { idToken, locale } = ctx.request.body;
	const decodedIdToken = await auth.verifyIdToken(idToken);

	// Only process if the user just signed in in the last 5 minutes.
	if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
		ctx.status = 401;
		ctx.body = 'Recent sign in required!';
		return;
	}

	await auth.setCustomUserClaims(decodedIdToken.uid, {
		locale,
	});

	const days = 14;
	const expiresIn = days * 60 * 60 * 24 * 1000;

	const sessionCookie = await auth.createSessionCookie(idToken, {
		expiresIn,
	});

	ctx.body = { cookie: sessionCookie, expiresIn };
});

router.post('/session/extend', async (ctx) => {
	const { idToken, locale } = ctx.body;
	const decodedIdToken = await auth.verifyIdToken(idToken);

	// Only process if the user just signed in in the last 5 minutes.
	if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
		ctx.status = 401;
		ctx.body = 'Recent sign in required!';
		return;
	}

	await auth.setCustomUserClaims(decodedIdToken.uid, {
		locale,
	});

	const days = 14;
	const expiresIn = days * 60 * 60 * 24 * 1000;

	const sessionCookie = await auth.createSessionCookie(idToken, {
		expiresIn,
	});

	ctx.body = { cookie: sessionCookie, expiresIn };
});

async function refreshSessionCookie(uid: string, expiresIn: number) {
	const config = process.env.VITE_GOOGLE_API_KEY;

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
