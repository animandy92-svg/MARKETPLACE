import { Router } from 'express';
import Database from 'better-sqlite3';
import { authenticateToken } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, '..', 'db', 'marketplace.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const router = Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT ci.*, p.name, p.price, p.image, p.stock, p.category, p.description, p.rating, p.specs
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    const parsed = items.map(i => ({ ...i, specs: JSON.parse(i.specs) }));
    res.json(parsed);
  } catch (err) {
    console.error('Cart get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, quantity);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:productId', authenticateToken, (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, req.user.id, req.params.productId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Cart update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:productId', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    res.json({ success: true });
  } catch (err) {
    console.error('Cart delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
