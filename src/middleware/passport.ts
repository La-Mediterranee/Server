//@ts-ignore
import { default as passport } from 'koa-passport';

import fastifyPassport from 'fastify-passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

import { discord } from '../utils/consts.js';

interface FirebaseUser extends Express.User {
	uid: string;
}

fastifyPassport.registerUserDeserializer(async (user, request) => {
	console.log('user', user);
	return (user as FirebaseUser).uid;
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

passport.serializeUser((user, next) => {
	console.log('user', user);
	next(null, (user as FirebaseUser).uid);
});

passport.deserializeUser(async (uid, next) => {
	console.log('uid', uid);
	next(null, uid as Express.User);
});

passport.use(
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

export default passport;
