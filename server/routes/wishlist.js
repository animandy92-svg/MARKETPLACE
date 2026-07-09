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
      SELECT w.*, p.name, p.price, p.image, p.stock, p.category, p.description, p.rating, p.specs
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(req.user.id);

    const parsed = items.map(i => ({ ...i, specs: JSON.parse(i.specs) }));
    res.json(parsed);
  } catch (err) {
    console.error('Wishlist get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:productId', authenticateToken, (req, res) => {
  try {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, req.params.productId);
    res.json({ success: true });
  } catch (err) {
    console.error('Wishlist add error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:productId', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    res.json({ success: true });
  } catch (err) {
    console.error('Wishlist delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
