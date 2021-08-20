import Router from 'koa-router';
import passport from 'koa-passport';

import { auth, db } from '@config/firebase';
import { discord } from 'src/utils/consts';

import { signInFirebaseTemplateWithPostMessage } from 'src/utils/helpers';
import type { Stripe } from 'stripe';
import { stripe } from '@config/stripe';

// import type { auth } from 'firebase-admin';

interface LoginQuery {
	provider: 'discord' | 'steam' | 'firebase';
}

interface OAuthUser {
	id: string;
	provider: string;
	[key: string]: string;
}

const router = new Router({
	strict: true
});

router.use(passport.initialize() as any);

router.get(
	'/handler/:provider',
	passport.authenticate(['discord'], { session: false }),
	async (ctx) => {
		const req = ctx;
		console.log(req.query.state);

		// 	const provider = user?.provider;
		try {
			const user = req.query as OAuthUser;
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
			ctx.body = `Error with Auth the handler`;
			ctx.status = 500;
			// ctx.throw(500, `Error with Auth the handler`);
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
				state: 'discord'
			})(ctx as any, next);
			break;
		case 'steam':
			break;
		default:
			ctx.throw(502, `Provider not supported`);
			break;
	}
});

router.post('/');

// router.get('/discord', (req, res) => {
// 	const redirect = encodeURIComponent(discord.redirectURL);
// 	res.redirect(
// 		`https://discordapp.com/api/oauth2/authorize?client_id=${discord.clientID}&scope=identify&response_type=code&redirect_uri=${redirect}`
// 	);
// });

export default router;
