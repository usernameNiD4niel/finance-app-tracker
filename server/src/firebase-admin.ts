import * as admin from 'firebase-admin';
import * as path from 'path';

// Download service-account.json from Firebase Console → Project Settings → Service Accounts
// Place it at server/service-account.json (already in .gitignore)
const serviceAccount = require(path.join(__dirname, '../service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
