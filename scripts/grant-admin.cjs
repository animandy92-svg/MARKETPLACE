const { createRequire } = require('node:module');
const path = require('node:path');
const fromFunctions = createRequire(path.join(__dirname, '../functions/package.json'));
const { initializeApp, applicationDefault } = fromFunctions('firebase-admin/app');
const { getAuth } = fromFunctions('firebase-admin/auth');
const email = process.argv[2];
if (!email || !email.includes('@')) throw new Error('Usage: node scripts/grant-admin.cjs email [--revoke]');
initializeApp({credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || 'jack-of-all-trades-marketplace'});
(async () => {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {...user.customClaims, admin: !process.argv.includes('--revoke')});
  console.log(`Admin role ${process.argv.includes('--revoke') ? 'revoked from' : 'granted to'} ${email}. Sign out and sign in again to refresh access.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
