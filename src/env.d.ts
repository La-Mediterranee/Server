declare namespace NodeJS {
	export interface ProcessEnv {
		readonly DISCORD_CLIENT_ID: string;
		readonly DISCORD_CLIENT_SECRET: string;
		readonly STRIPE_SECRET: string;
		readonly STRIPE_WEBHOOK_SECRET: string;
		readonly GOOGLE_APPLICATION_CREDENTIALS: string;
		readonly GOOGLE_STORAGE_BUCKET: string;
		readonly HOSTNAME: string;
	}

	export interface ImportMetaEnv {
		readonly DISCORD_CLIENT_ID: string;
		readonly DISCORD_CLIENT_SECRET: string;
		readonly STRIPE_SECRET: string;
		readonly STRIPE_WEBHOOK_SECRET: string;
		readonly GOOGLE_APPLICATION_CREDENTIALS: string;
	}
}
