import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, '..', 'db', 'marketplace.db'));
db.pragma('journal_mode = WAL');

const router = Router();

router.get('/', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, minRating, inStock, sort, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(Number(maxPrice));
    }

    if (minRating) {
      query += ' AND rating >= ?';
      params.push(Number(minRating));
    }

    if (inStock === 'true') {
      query += ' AND stock > 0';
    }

    switch (sort) {
      case 'price-low': query += ' ORDER BY price ASC'; break;
      case 'price-high': query += ' ORDER BY price DESC'; break;
      case 'rating': query += ' ORDER BY rating DESC'; break;
      default: query += ' ORDER BY name ASC';
    }

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const products = db.prepare(query).all(...params);
    const parsed = products.map(p => ({ ...p, specs: JSON.parse(p.specs) }));

    const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as total').replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');
    const countParams = params.slice(0, -2);
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ products: parsed, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product, specs: JSON.parse(product.specs) });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
