import * as admin from 'firebase-admin';
import { GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_STORAGE_BUCKET } from 'src/utils/consts';

admin.initializeApp({
	credential: admin.credential.cert(GOOGLE_APPLICATION_CREDENTIALS),
	storageBucket: GOOGLE_STORAGE_BUCKET
});

export const firebase = admin;
export const db = admin.firestore();
export const auth = admin.auth();
export const bucket = admin.storage().bucket();
