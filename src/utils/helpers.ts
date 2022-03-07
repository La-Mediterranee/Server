import { auth } from '../config/firebase.js';

// Types
import type { Next, Context } from 'koa';
import type { IRouterContext } from 'koa-router';

export function runAsync<T>(
	cb: (ctx: Context | IRouterContext, next?: Next) => Promise<T>
) {
	return (ctx: Context | IRouterContext, next: Next) => {
		cb(ctx, next).catch(next);
	};
}

/**
 * Decodes the JSON Web Token sent via the frontend app.
 * Makes the currentUser (firebase) data available on the body.
 */
export async function decodeJWT(ctx: Context | IRouterContext, next: Next) {
	if (ctx.headers?.authorization?.startsWith('Bearer ')) {
		const idToken = ctx.headers.authorization.split('Bearer ')[1];

		console.debug('idToken', idToken);

		try {
			const decodedToken = await auth.verifyIdToken(idToken);
			ctx.state.user = decodedToken;
		} catch (err) {
			console.log(err);
		}
	}

	await next();
}

/**
 * Throws an error if the currentUser does not exist on the request
 */
export function validateUser(ctx: Context | IRouterContext) {
	const user = ctx.state.user;
	if (!user) {
		ctx.throw(
			400,
			'You must be logged in to make this request. i.e Authroization: Bearer <token>'
		);
	}

	return user;
}

async function deleteCollection(db, collectionPath, batchSize) {
	const collectionRef = db.collection(collectionPath);
	const query = collectionRef.orderBy('__name__').limit(batchSize);

	return new Promise((resolve, reject) => {
		deleteQueryBatch(db, query, resolve).catch(reject);
	});
}

async function deleteQueryBatch(db, query, resolve) {
	const snapshot = await query.get();

	const batchSize = snapshot.size;
	if (batchSize === 0) {
		// When there are no documents left, we are done
		resolve();
		return;
	}

	// Delete documents in a batch
	const batch = db.batch();
	snapshot.docs.forEach((doc) => {
		batch.delete(doc.ref);
	});
	await batch.commit();

	// Recurse on the next process tick, to avoid
	// exploding the stack.
	process.nextTick(() => {
		deleteQueryBatch(db, query, resolve);
	});
}

export function signInFirebaseTemplateWithPostMessage(
	token: string,
	email: string,
	displayName: string,
	photoURL: string
) {
	return `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta http-equiv="X-UA-Compatible" content="IE=edge" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Provider Login</title>
			<style>
				@import url('http://fonts.cdnfonts.com/css/whitney-2');
	
				* {
					box-sizing: border-box;
					padding: 0;
					margin: 0;
				}
	
				body {
					background: #36393f;
					display: flex;
					justify-content: center;
					align-items: center;
					width: 100%;
					min-height: 100vh;
				}

				div {
					position: relative;
				}
	
				img {
					width: 7em;
					height: 7em;
				}
	
				video {
					width: 12em;
					height: 12em;
				}
	
				h2 {
					bottom: 0.8em;
					width: 100%;
					position: absolute;
					color: white;
					text-align: center;
					font-family: Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif;
				}
			</style>
		</head>
		<body>
			<div>
				<video autoplay loop muted playsinline>
					<!-- src="https://discord.com/assets/3b0d96ed8113994f3d139088726cfecd.webm"-->
					<source
						type="video/webm"
						src="http://localhost:3000/discord.webm"
					/>
					<img
						decoding="async"
						src="https://cdn.discordapp.com/attachments/414258067870449665/445736475158380544/discord.gif"
						alt="Spinning Discord Logo"
					/>
					</video>
				<h2>Logging in</h2>
			</div>
			<script>
				const data = {
					token: '${token}',
					email: '${email}',
					displayName: '${displayName}',
					photoURL: '${photoURL}'
				};
				window.opener.postMessage(data, '*');
			</script>
		</body>
	</html>	
	`;
}
