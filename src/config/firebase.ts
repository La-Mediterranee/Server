import { type App, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';

import {
	GOOGLE_APPLICATION_CREDENTIALS,
	GOOGLE_STORAGE_BUCKET,
} from '../utils/consts.js';

const firebase = initializeApp({
	credential: cert(GOOGLE_APPLICATION_CREDENTIALS),
	storageBucket: GOOGLE_STORAGE_BUCKET,
});

export const auth = getAuth(firebase);
export const db = getFirestore(firebase);
export const messaging = getMessaging(firebase);
export const bucket = getStorage(firebase).bucket();
