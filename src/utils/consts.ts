import * as dotenv from 'dotenv';
dotenv.config();

export const { WEB_URL, PORT, NODE_ENV, HOSTNAME, ORIGIN } = process.env;

// export const WEB_URL = process.env.WEB_URL as string;
// export const PORT = process.env.PORT as string;
// export const NODE_ENV = process.env.NODE_ENV as string;
// export const HOSTNAME = process.env.HOSTNAME as string;
// export const ORIGIN = process.env.ORIGIN as string;

export const ANDROID_SHA256HASH = process.env.ANDROID_SHA256HASH as string;
export const ANDROID_PACKAGENAME = process.env.ANDROID_PACKAGENAME as string;

export const CDN_URL = 'cdn.shehata.rocks';
export const GOOGLE_APPLICATION_CREDENTIALS = process.env
	.GOOGLE_APPLICATION_CREDENTIALS as string;
export const GOOGLE_STORAGE_BUCKET = process.env
	.GOOGLE_STORAGE_BUCKET as string;

export const STRIPE_WEBHOOK_SECRET = process.env
	.STRIPE_WEBHOOK_SECRET as string;
export const STRIPE_SECRET = process.env.STRIPE_SECRET as string;

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID as string;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET as string;

export const discord = {
	clientID: DISCORD_CLIENT_ID,
	clientSecret: DISCORD_CLIENT_SECRET,
	redirectURL: '/v1/auth/handler/discord', // http://localhost:8080
	scopes: ['email'],
};
