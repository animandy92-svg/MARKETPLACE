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
    const orders = db.prepare(`
      SELECT o.*, 
        GROUP_CONCAT(oi.product_id || ':' || oi.quantity || ':' || oi.price, '|') as items_str
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    const parsed = orders.map(order => ({
      ...order,
      items: order.items_str ? order.items_str.split('|').map(item => {
        const [productId, quantity, price] = item.split(':');
        return { productId: Number(productId), quantity: Number(quantity), price: Number(price) };
      }) : [],
      items_str: undefined,
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Orders get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = db.prepare(`
      SELECT oi.*, p.name, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    res.json({ ...order, items });
  } catch (err) {
    console.error('Order detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { items, total, tax, shippingAddress, paystackRef } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'items are required' });

    const result = db.prepare(
      'INSERT INTO orders (user_id, total, tax, paystack_ref, shipping_address) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, total, tax || 0, paystackRef || null, shippingAddress || '');

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
    );

    for (const item of items) {
      insertItem.run(result.lastInsertRowid, item.productId, item.quantity, item.price);
    }

    // Clear the cart after order
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    console.error('Order create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
