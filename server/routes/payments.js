import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    const { email, amount, metadata } = req.body;
    if (!email || !amount) {
      return res.status(400).json({ error: 'email and amount are required' });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Paystack not configured' });
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses kobo/pesewas
        currency: 'GHS',
        metadata: metadata || {},
        callback_url: `${process.env.CLIENT_URL}/checkout/verify`,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Payment initialization failed' });
    }

    res.json(data.data);
  } catch (err) {
    console.error('Payment init error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Paystack not configured' });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${req.params.reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
