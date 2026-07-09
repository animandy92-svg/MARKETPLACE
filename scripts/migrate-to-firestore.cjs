const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, getDocs } = require("firebase/firestore");
const Database = require("better-sqlite3");
const path = require("path");

// Firebase client config (using the same values from .env)
const firebaseConfig = {
  apiKey: "AIzaSyBmAWZny_iEpMkdRqw_8JUejWF0xE4PMMM",
  authDomain: "jack-of-all-trades-marketplace.firebaseapp.com",
  projectId: "jack-of-all-trades-marketplace",
  appId: "1:370501488724:web:f53ee2eeb1dc47bd6fddc1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const sqlite = new Database(path.join(__dirname, "..", "server", "db", "marketplace.db"));

async function migrateProducts() {
  console.log("Migrating products to Firestore...");

  // Check if products already exist
  const existing = await getDocs(collection(db, "products"));
  if (!existing.empty) {
    console.log(`Firestore already has ${existing.size} products. Skipping.`);
    return;
  }

  const products = sqlite.prepare("SELECT * FROM products").all();

  for (const product of products) {
    await setDoc(doc(db, "products", String(product.id)), {
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      image: product.image,
      specs: JSON.parse(product.specs),
      stock: product.stock,
      rating: product.rating,
      created_at: new Date().toISOString(),
    });
    console.log(`  ✓ ${product.name}`);
  }

  console.log(`Migrated ${products.length} products to Firestore!`);
}

migrateProducts()
  .then(() => {
    sqlite.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    sqlite.close();
    process.exit(1);
  });
