import { type App, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import {
	GOOGLE_APPLICATION_CREDENTIALS,
	GOOGLE_STORAGE_BUCKET,
} from '../utils/consts.js';

let firebase: App;
try {
	firebase = initializeApp({
		credential: cert(GOOGLE_APPLICATION_CREDENTIALS),
		storageBucket: GOOGLE_STORAGE_BUCKET,
	});
} catch (error) {
	console.error(error);
}

export const db = getFirestore();
export const auth = getAuth();
export const bucket = getStorage().bucket();
