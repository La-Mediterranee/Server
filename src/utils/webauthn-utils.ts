import crypto from 'crypto';
import base64url from 'base64url';
import cbor from 'cbor';

interface AuthDataStruct {
	rpIdHash: Buffer;
	flagsBuf: Buffer;
	flags: number;
	counter: number;
	counterBuf: Buffer;
	aaguid: Buffer;
	credID: Buffer;
	COSEPublicKey: Buffer;
}

interface AuthData {
	rpIdHash: Buffer;
	flagsBuf: Buffer;
	flags: number;
	counter: number;
	counterBuf: Buffer;
	aaguid: Buffer;
	credID: string;
	COSEPublicKey: Buffer;
	fmt: string;
	publicKey: string;
}

interface AssertAuthData {
	rpIdHash: Buffer;
	flagsBuf: Buffer;
	flags: number;
	counter: number;
	counterBuf: Buffer;
}

/**
 * U2F Presence constant
 */
const U2F_USER_PRESENTED = 0x01;

/**
 * Takes signature, data and PEM public key and tries to verify signature
 * @param  signature
 * @param  data
 * @param  publicKey - PEM encoded public key
 * @return
 */
function verifySignature(
	signature: Buffer,
	data: Buffer,
	publicKey: string
): boolean {
	return crypto
		.createVerify('SHA256')
		.update(data)
		.verify(publicKey, signature);
}

/**
 * Returns base64url encoded buffer of the given length
 * @param  len - length of the buffer
 * @return     - base64url random buffer
 */
function randomBase64URLBuffer(len: number): string {
	len = len || 32;

	const buff = crypto.randomBytes(len);

	return encodeBase64Url(buff);
}

export interface MakePublicKeyCredentialOptions {
	status?: string;
	challenge: string;
	rp: {
		name: string;
	};
	user: {
		id: string;
		name: string;
		displayName: string;
	};
	attestation: string;
	pubKeyCredParams: {
		type: string;
		alg: number;
	}[];
}

/**
 * Generates makeCredentials request
 * @param  username       	- username
 * @param  displayName    	- user's personal display name
 * @param  id             	- user's base64url encoded id
 * @return 					- server encoded make credentials request
 */

const generateServerMakeCredRequest = (
	username: string,
	displayName: string,
	id: string
): MakePublicKeyCredentialOptions => {
	return {
		challenge: randomBase64URLBuffer(32),
		rp: {
			name: 'La Mediterranee',
		},
		user: {
			id: id,
			name: username,
			displayName: displayName,
		},
		attestation: 'direct',
		pubKeyCredParams: [
			{
				type: 'public-key',
				alg: -7, // "ES256" IANA COSE Algorithms registry
			},
		],
	};
};

/**
 * Generates getAssertion request
 * @param  authenticators 	- list of registered authenticators
 * @return 					- server encoded get assertion request
 */
let generateServerGetAssertion = (
	authenticators: any[]
): PublicKeyCredentialRequestOptions => {
	let allowCredentials: any[] = [];
	for (let authr of authenticators) {
		allowCredentials.push({
			type: 'public-key',
			id: authr.credID,
			transports: ['usb', 'nfc', 'ble'],
		});
	}

	return {
		challenge: randomBase64URLBuffer(32) as unknown as BufferSource,
		allowCredentials: allowCredentials,
	};
};

/**
 * Returns SHA-256 digest of the given data.
 * @param  {Buffer} data - data to hash
 * @return {Buffer}      - the hash
 */
let hash = (data: Buffer): Buffer => {
	return crypto.createHash('SHA256').update(data).digest();
};

/**
 * Takes COSE encoded public key and converts it to RAW PKCS ECDHA key
 * @param  {Buffer} COSEPublicKey - COSE encoded public key
 * @return {Buffer}               - RAW PKCS encoded public key
 */
let COSEECDHAtoPKCS = (COSEPublicKey: Buffer): Buffer => {
	/* 
	   +------+-------+-------+---------+----------------------------------+
	   | name | key   | label | type    | description                      |
	   |      | type  |       |         |                                  |
	   +------+-------+-------+---------+----------------------------------+
	   | crv  | 2     | -1    | int /   | EC Curve identifier - Taken from |
	   |      |       |       | tstr    | the COSE Curves registry         |
	   |      |       |       |         |                                  |
	   | x    | 2     | -2    | bstr    | X Coordinate                     |
	   |      |       |       |         |                                  |
	   | y    | 2     | -3    | bstr /  | Y Coordinate                     |
	   |      |       |       | bool    |                                  |
	   |      |       |       |         |                                  |
	   | d    | 2     | -4    | bstr    | Private key                      |
	   +------+-------+-------+---------+----------------------------------+
	*/

	let coseStruct = cbor.decodeAllSync(COSEPublicKey)[0];
	let tag = Buffer.from([0x04]);
	let x = coseStruct.get(-2);
	let y = coseStruct.get(-3);

	return Buffer.concat([tag, x, y]);
};

/**
 * Convert binary certificate or public key to an OpenSSL-compatible PEM text format.
 * @param  buffer - Cert or PubKey buffer
 * @return        - PEM
 */
let ASN1toPEM = (pkBuffer: Buffer): string => {
	if (!Buffer.isBuffer(pkBuffer))
		throw new Error('ASN1toPEM: pkBuffer must be Buffer.');

	let type;
	if (pkBuffer.length == 65 && pkBuffer[0] == 0x04) {
		/*
			If needed, we encode rawpublic key to ASN structure, adding metadata:
			SEQUENCE {
			  SEQUENCE {
				 OBJECTIDENTIFIER 1.2.840.10045.2.1 (ecPublicKey)
				 OBJECTIDENTIFIER 1.2.840.10045.3.1.7 (P-256)
			  }
			  BITSTRING <raw public key>
			}
			Luckily, to do that, we just need to prefix it with constant 26 bytes (metadata is constant).
		*/

		pkBuffer = Buffer.concat([
			Buffer.from(
				'3059301306072a8648ce3d020106082a8648ce3d030107034200',
				'hex'
			),
			pkBuffer,
		]);

		type = 'PUBLIC KEY';
	} else {
		type = 'CERTIFICATE';
	}

	let b64cert = pkBuffer.toString('base64');

	let PEMKey = '';
	for (let i = 0; i < Math.ceil(b64cert.length / 64); i++) {
		let start = 64 * i;

		PEMKey += b64cert.substr(start, 64) + '\n';
	}

	PEMKey = `-----BEGIN ${type}-----\n` + PEMKey + `-----END ${type}-----\n`;

	return PEMKey;
};

/**
 * Parses authenticatorData buffer.
 * @param  buffer - authenticatorData buffer
 * @return        - parsed authenticatorData struct
 */
let parseMakeCredAuthData = (buffer: Buffer): AuthDataStruct => {
	let rpIdHash = buffer.slice(0, 32);
	buffer = buffer.slice(32);
	let flagsBuf = buffer.slice(0, 1);
	buffer = buffer.slice(1);
	let flags = flagsBuf[0];
	let counterBuf = buffer.slice(0, 4);
	buffer = buffer.slice(4);
	let counter = counterBuf.readUInt32BE(0);
	let aaguid = buffer.slice(0, 16);
	buffer = buffer.slice(16);
	let credIDLenBuf = buffer.slice(0, 2);
	buffer = buffer.slice(2);
	let credIDLen = credIDLenBuf.readUInt16BE(0);
	let credID = buffer.slice(0, credIDLen);
	buffer = buffer.slice(credIDLen);
	let COSEPublicKey = buffer;

	return {
		rpIdHash,
		flagsBuf,
		flags,
		counter,
		counterBuf,
		aaguid,
		credID,
		COSEPublicKey,
	};
};

let verifyAuthenticatorAttestationResponse = (webAuthnResponse) => {
	const attestationBuffer = Buffer.from(
		webAuthnResponse.response.attestationObject,
		'base64url'
	);
	// base64url.toBuffer();
	const ctapMakeCredResp = cbor.decodeAllSync(attestationBuffer)[0];

	const response: {
		verified: boolean;
		authrInfo?: {
			fmt: string;
			publicKey: string;
			counter: number;
			credID: string;
		};
	} = { verified: false };
	if (ctapMakeCredResp.fmt === 'fido-u2f') {
		let authrDataStruct = parseMakeCredAuthData(ctapMakeCredResp.authData);

		if (!(authrDataStruct.flags & U2F_USER_PRESENTED))
			throw new Error('User was NOT presented durring authentication!');

		let clientDataHash = hash(
			Buffer.from(webAuthnResponse.response.clientDataJSON, 'base64url')
		);
		let reservedByte = Buffer.from([0x00]);
		let publicKey = COSEECDHAtoPKCS(authrDataStruct.COSEPublicKey);
		let signatureBase = Buffer.concat([
			reservedByte,
			authrDataStruct.rpIdHash,
			clientDataHash,
			authrDataStruct.credID,
			publicKey,
		]);

		let PEMCertificate = ASN1toPEM(ctapMakeCredResp.attStmt.x5c[0]);
		let signature = ctapMakeCredResp.attStmt.sig;

		response.verified = verifySignature(
			signature,
			signatureBase,
			PEMCertificate
		);

		if (response.verified) {
			response.authrInfo = {
				fmt: 'fido-u2f',
				publicKey: encodeBase64Url(publicKey),
				counter: authrDataStruct.counter,
				credID: encodeBase64Url(authrDataStruct.credID),
			};
		}
	}

	return response;
};

function decodeBase64Url(
	data:
		| WithImplicitCoercion<string>
		| {
				[Symbol.toPrimitive](hint: 'string'): string;
		  },
	encoding: BufferEncoding = 'utf-8'
) {
	return Buffer.from(data, 'base64url').toString(encoding);
}

function encodeBase64Url(
	data:
		| (Uint8Array | ReadonlyArray<number>)
		| WithImplicitCoercion<Uint8Array | ReadonlyArray<number> | string>
) {
	return Buffer.from(data).toString('base64url');
}
/**
 * Takes an array of registered authenticators and find one specified by credID
 * @param  credID        	- base64url encoded credential
 * @param  authenticators 	- list of authenticators
 * @return                	- found authenticator
 */
let findAuthr = (credID: string, authenticators: Array<AuthData>): AuthData => {
	for (let authr of authenticators) {
		if (authr.credID === credID) return authr;
	}

	throw new Error(`Unknown authenticator with credID ${credID}!`);
};

/**
 * Parses AuthenticatorData from GetAssertion response
 * @param  buffer 	- Auth data buffer
 * @return  		- parsed authenticatorData struct
 */
let parseGetAssertAuthData = (buffer: Buffer): AssertAuthData => {
	const rpIdHash = buffer.slice(0, 32);
	buffer = buffer.slice(32);
	const flagsBuf = buffer.slice(0, 1);
	buffer = buffer.slice(1);
	const flags = flagsBuf[0];
	const counterBuf = buffer.slice(0, 4);
	buffer = buffer.slice(4);
	const counter = counterBuf.readUInt32BE(0);

	return { rpIdHash, flagsBuf, flags, counter, counterBuf };
};

let verifyAuthenticatorAssertionResponse = (
	webAuthnResponse,
	authenticators
) => {
	let authr = findAuthr(webAuthnResponse.id, authenticators);
	let authenticatorData = Buffer.from(
		webAuthnResponse.response.authenticatorData,
		'base64url'
	);

	let response = { verified: false };
	if (authr.fmt === 'fido-u2f') {
		let authrDataStruct = parseGetAssertAuthData(authenticatorData);

		if (!(authrDataStruct.flags & U2F_USER_PRESENTED))
			throw new Error('User was NOT presented durring authentication!');

		let clientDataHash = hash(
			Buffer.from(webAuthnResponse.response.clientDataJSON, 'base64url')
			// base64url.toBuffer(webAuthnResponse.response.clientDataJSON)
		);
		let signatureBase = Buffer.concat([
			authrDataStruct.rpIdHash,
			authrDataStruct.flagsBuf,
			authrDataStruct.counterBuf,
			clientDataHash,
		]);

		let publicKey = ASN1toPEM(
			Buffer.from(authr.publicKey, 'base64url')
			// base64url.toBuffer(authr.publicKey)
		);
		let signature = Buffer.from(
			webAuthnResponse.response.signature,
			'base64url'
		);
		// base64url.toBuffer(webAuthnResponse.response.signature);

		response.verified = verifySignature(
			signature,
			signatureBase,
			publicKey
		);

		if (response.verified) {
			if (response.counter <= authr.counter)
				throw new Error('Authr counter did not increase!');

			authr.counter = authrDataStruct.counter;
		}
	}

	return response;
};

export {
	randomBase64URLBuffer,
	generateServerMakeCredRequest,
	generateServerGetAssertion,
	verifyAuthenticatorAttestationResponse,
	verifyAuthenticatorAssertionResponse,
};
