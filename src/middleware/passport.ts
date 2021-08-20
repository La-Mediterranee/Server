import passport from 'koa-passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

import { discord } from 'src/utils/consts';

interface FirebaseUser extends Express.User {
	uid: string;
}

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
			scope: discord.scopes
		},
		async function (accessToken, refreshToken, profile, done) {
			return done(null, profile);
		}
	)
);

export default passport;
