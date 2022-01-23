// import Router from 'koa-router';
// import base64url from 'base64url';

// import * as crypto from 'crypto';

// import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

// import { auth, db } from '@config/firebase';
// import { ANDROID_SHA256HASH, HOSTNAME, ORIGIN } from '@utils/consts';

// import type { Next, ParameterizedContext } from 'koa';

// // It is strongly advised that authenticators get their own DB
// // table, ideally with a foreign key to a specific UserModel
// type Authenticator = {
// 	type: string;
// 	credentialID: Buffer;
// 	credentialPublicKey: Buffer;
// 	counter: number;
// 	// ['usb' | 'ble' | 'nfc' | 'internal']
// 	transports?: AuthenticatorTransport[];
// };

// class UsersDb {
// 	async find() {}
// }

// const RP_NAME = 'WebAuthn La-Mediterranee';
// const TIMEOUT = 30 * 1000 * 60;

// const router = new Router();

// router.post('/registerRequest', csrfCheck, sessionCheck, async (ctx) => {
// 	const username = ctx.session?.username;
// 	const user = db.get('users').find({ username: username }).value();

// 	try {
// 		const excludeCredentials: PublicKeyCredentialDescriptor[] = [];

// 		if (user.credentials.length > 0) {
// 			for (let cred of user.credentials) {
// 				excludeCredentials.push({
// 					id: cred.credId,
// 					type: 'public-key',
// 					transports: ['internal']
// 				});
// 			}
// 		}

// 		const pubKeyCredParams: PublicKeyCredentialParameters[] = [];
// 		// const params = [-7, -35, -36, -257, -258, -259, -37, -38, -39, -8];
// 		const params = [-7, -257];
// 		for (let param of params) {
// 			pubKeyCredParams.push({ type: 'public-key', alg: param });
// 		}

// 		const as: AuthenticatorSelectionCriteria | undefined = {};
// 		const aa: AuthenticatorAttachment | undefined =
// 			ctx.body.authenticatorSelection.authenticatorAttachment;
// 		const rr: boolean = ctx.body.authenticatorSelection.requireResidentKey;
// 		const uv: UserVerificationRequirement | undefined =
// 			ctx.body.authenticatorSelection.userVerification;
// 		const cp: AttestationConveyancePreference = ctx.body.attestation;

// 		let asFlag = false;
// 		let authenticatorSelection: AuthenticatorSelectionCriteria | undefined = undefined;
// 		let attestation: AttestationConveyancePreference = 'none';

// 		if (aa && (aa == 'platform' || aa == 'cross-platform')) {
// 			asFlag = true;
// 			as.authenticatorAttachment = aa;
// 		}

// 		if (rr && typeof rr == 'boolean') {
// 			asFlag = true;
// 			as.requireResidentKey = rr;
// 		}

// 		if (uv && (uv == 'required' || uv == 'preferred' || uv == 'discouraged')) {
// 			asFlag = true;
// 			as.userVerification = uv;
// 		}

// 		if (asFlag) {
// 			authenticatorSelection = as;
// 		}

// 		if (cp && (cp == 'none' || cp == 'indirect' || cp == 'direct')) {
// 			attestation = cp;
// 		}

// 		const options = generateRegistrationOptions({
// 			rpName: RP_NAME,
// 			rpID: HOSTNAME,
// 			userID: user.id,
// 			userName: user.username,
// 			timeout: TIMEOUT,
// 			// Prompt users for additional information about the authenticator.
// 			attestationType: attestation,
// 			// Prevent users from re-registering existing authenticators
// 			excludeCredentials,
// 			authenticatorSelection
// 		});

// 		ctx.session!.challenge = options.challenge;

// 		options.pubKeyCredParams = [];
// 		for (let param of params) {
// 			options.pubKeyCredParams.push({ type: 'public-key', alg: param });
// 		}

// 		ctx.body = options;
// 	} catch (e) {
// 		ctx.throw((e as Error)?.message, 400);
// 	}
// });

// /**
//  * Register user credential.
//  * Input format:
//  * ```{
//      id: String,
//      type: 'public-key',
//      rawId: String,
//      response: {
//        clientDataJSON: String,
//        attestationObject: String,
//        signature: String,
//        userHandle: String
//      }
//  * }```
//  **/
// router.post('/registerResponse', csrfCheck, sessionCheck, async (ctx) => {
// 	const username = ctx.session?.username;
// 	const expectedChallenge = ctx.session?.challenge;
// 	const expectedOrigin = getOrigin(ctx.get('User-Agent') as string);
// 	const expectedRPID = HOSTNAME;
// 	const credId = ctx.body.id;
// 	const type = ctx.body.type;

// 	try {
// 		const { body } = ctx;

// 		const verification = await verifyRegistrationResponse({
// 			credential: body,
// 			expectedChallenge,
// 			expectedOrigin,
// 			expectedRPID
// 		});

// 		const { verified, registrationInfo } = verification;

// 		if (!verified) {
// 			throw 'User verification failed.';
// 		}

// 		// const { base64PublicKey, base64CredentialID, counter } = attestationInfo ?? {};
// 		const {
// 			credentialID: base64CredentialID,
// 			credentialPublicKey: base64PublicKey,
// 			counter
// 		} = registrationInfo ?? {};

// 		const userCollection = db.collection('users');
// 		userCollection.doc();

// 		const user = await userCollection.where('username', '==', username).get();

// 		const existingCred = user.credentials.find((cred) => cred.credID === base64CredentialID);

// 		if (!existingCred) {
// 			/**
// 			 * Add the returned device to the user's list of devices
// 			 */
// 			user.credentials.push({
// 				publicKey: base64PublicKey,
// 				credId: base64CredentialID,
// 				prevCounter: counter
// 			});
// 		}

// 		db.get('users').find({ username: username }).assign(user).write();

// 		delete ctx.session?.challenge;

// 		// Respond with user info
// 		ctx.body = user;
// 	} catch (e) {
// 		delete ctx.session?.challenge;
// 		ctx.throw(400, (e as Error).message);
// 	}
// });

// async function csrfCheck(
// 	ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
// 	next: Next
// ) {
// 	if (ctx.get('X-Requested-With') != 'XMLHttpRequest') {
// 		return ctx.throw(400, 'invalid access.');
// 	}

// 	return await next();
// }

// /**
//  * Checks CSRF protection using custom header `X-Requested-With`
//  * If the session doesn't contain `signed-in`, consider the user is not authenticated.
//  **/
// async function sessionCheck(
// 	ctx: ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
// 	next: Next
// ) {
// 	if (!ctx.session!['signed-in']) {
// 		return ctx.throw(401, 'not signed in.');
// 	}

// 	return await next();
// }

// function getOrigin(userAgent: string) {
// 	let origin = '';
// 	// To support Android apps you need this you can follow https://codelabs.developers.google.com/codelabs/fido2-for-android/#2
// 	if (userAgent.indexOf('okhttp') === 0) {
// 		const octArray = ANDROID_SHA256HASH.split(':').map((h) => parseInt(h, 16));
// 		const androidHash = base64url.encode(octArray.toString());
// 		origin = `android:apk-key-hash:${androidHash}`;
// 	} else {
// 		origin = ORIGIN;
// 	}

// 	return origin;
// }
