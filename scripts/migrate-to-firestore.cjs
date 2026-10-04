const { createRequire } = require('node:module');
const path = require('node:path');
const Database = require('better-sqlite3');
const fromFunctions = createRequire(path.join(__dirname, '../functions/package.json'));
const { initializeApp, applicationDefault } = fromFunctions('firebase-admin/app');
const { getFirestore } = fromFunctions('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || 'jack-of-all-trades-marketplace';
initializeApp({ projectId, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential: applicationDefault()}) });
const db = getFirestore();
const sqlite = new Database(path.join(__dirname, '..', 'server', 'db', 'marketplace.db'), {readonly: true});
(async () => {
  if (!(await db.collection('products').limit(1).get()).empty) {
    console.log('Catalog is not empty. Skipping migration.');
    return;
  }
  const products = sqlite.prepare('SELECT * FROM products').all();
  for (const product of products) {
    await db.collection('products').doc(String(product.id)).create({
      name: product.name, category: product.category, price: product.price,
      description: product.description, image: product.image, specs: JSON.parse(product.specs),
      stock: product.stock, rating: product.rating, active: true, status: 'active',
    });
  }
  console.log(`Migrated ${products.length} products.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sqlite.close());
