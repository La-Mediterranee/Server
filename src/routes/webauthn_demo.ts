import crypto from 'crypto';
import Router from 'koa-router';
import base64url from 'base64url';

import { auth, db } from '../config/firebase.js';
import { ORIGIN } from '../utils/consts.js';

import {
	generateServerGetAssertion,
	generateServerMakeCredRequest,
	randomBase64URLBuffer,
	verifyAuthenticatorAssertionResponse,
	verifyAuthenticatorAttestationResponse,
} from '../utils/webauthn-utils.js';

import type { Next, ParameterizedContext } from 'koa';

const router = new Router();

const database = {};

router.post('/register', async (ctx) => {
	if (!ctx.body || !ctx.body.username || !ctx.body.name) {
		ctx.body = {
			status: 'failed',
			message: 'Request missing name or username field!',
		};
		return;
	}

	const username = ctx.body.username;
	const name = ctx.body.name;

	if (database[username] && database[username].registered) {
		ctx.body = {
			status: 'failed',
			message: `Username ${username} already exists`,
		};
		return;
	}

	database[username] = {
		name: name,
		registered: false,
		id: randomBase64URLBuffer(16),
		authenticators: [],
	};

	let challengeMakeCred = generateServerMakeCredRequest(
		username,
		name,
		database[username].id
	);

	challengeMakeCred.status = 'ok';

	if (ctx.session) {
		ctx.session.challenge = challengeMakeCred.challenge;
		ctx.session.username = username;
	}

	ctx.body = challengeMakeCred;
	return;
});

router.post('/login', (ctx, next) => {
	if (!ctx.body || !ctx.body.username) {
		ctx.body = {
			status: 'failed',
			message: 'Request missing username field!',
		};

		return;
	}

	let username = ctx.body.username;

	if (!database[username] || !database[username].registered) {
		ctx.body = {
			status: 'failed',
			message: `User ${username} does not exist!`,
		};

		return;
	}

	let getAssertion = generateServerGetAssertion(
		database[username].authenticators
	);
	//@ts-ignore
	getAssertion.status = 'ok';

	if (ctx.session) {
		ctx.session.challenge = getAssertion.challenge;
		ctx.session.username = username;
	}

	ctx.body = getAssertion;
});

router.post('/response', (ctx, response) => {
	if (
		!ctx.body ||
		!ctx.body.id ||
		!ctx.body.rawId ||
		!ctx.body.response ||
		!ctx.body.type ||
		ctx.body.type !== 'public-key'
	) {
		ctx.body = {
			status: 'failed',
			message:
				'Response missing one or more of id/rawId/response/type fields, or type is not public-key!',
		};

		return;
	}

	const webauthnResp = ctx.body;
	// const clientData = JSON.parse(
	// 	base64url.decode(webauthnResp.response.clientDataJSON)
	// 	);
	const clientData = JSON.parse(
		Buffer.from(webauthnResp.response.clientDataJSON, 'base64url').toString(
			'utf-8'
		)
	);

	/* Check challenge... */
	if (clientData.challenge !== ctx.session?.challenge) {
		ctx.body = {
			status: 'failed',
			message: "Challenges don't match!",
		};
	}

	/* ...and origin */
	if (clientData.origin !== ORIGIN) {
		ctx.body = {
			status: 'failed',
			message: "Origins don't match!",
		};
	}

	let result;
	if (webauthnResp.response.attestationObject !== undefined) {
		/* This is create cred */
		result = verifyAuthenticatorAttestationResponse(webauthnResp);

		if (result.verified) {
			database[ctx.session?.username].authenticators.push(
				result.authrInfo
			);
			database[ctx.session?.username].registered = true;
		}
	} else if (webauthnResp.response.authenticatorData !== undefined) {
		/* This is get assertion */
		result = verifyAuthenticatorAssertionResponse(
			webauthnResp,
			database[ctx.session?.username].authenticators
		);
	} else {
		ctx.body = {
			status: 'failed',
			message: 'Can not determine type of response!',
		};
	}

	if (result.verified) {
		try {
			ctx.session!.loggedIn = true;
			ctx.body = { status: 'ok' };
		} catch (error) {
			ctx.throw(500, <string>error);
		}
	} else {
		ctx.body = {
			status: 'failed',
			message: 'Can not authenticate signature!',
		};
	}
});
