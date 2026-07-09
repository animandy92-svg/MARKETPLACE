import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const tax = total * 0.1;
  const grandTotal = total + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold">No items to checkout</h1>
          <p className="text-muted-foreground">Add some products to your cart first.</p>
          <Link to="/products">
            <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      toast.error('Please enter a shipping address');
      return;
    }

    if (!PAYSTACK_KEY) {
      toast.error('Payment system not configured', { description: 'Please set up Paystack keys in .env' });
      return;
    }

    setIsProcessing(true);

    try {
      // Initialize Paystack transaction
      const initRes = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user?.email,
          amount: grandTotal,
          metadata: {
            userId: user?.id,
            itemCount: items.length,
          },
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || 'Payment initialization failed');
      }

      const { access_code, reference } = await initRes.json();

      // Load Paystack inline
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(script);

      script.onload = () => {
        const popup = (window as any).PaystackPop.setup({
          key: PAYSTACK_KEY,
          email: user?.email,
          amount: Math.round(grandTotal * 100),
          currency: 'GHS',
          ref: reference,
          onClose: () => {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          },
          callback: async (response: any) => {
            try {
              // Verify payment
              const verifyRes = await fetch(`${API_URL}/api/payments/verify/${response.reference}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const verifyData = await verifyRes.json();

              if (verifyData.data?.status === 'success') {
                // Create order
                await fetch(`${API_URL}/api/orders`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    items: items.map(i => ({
                      productId: Number(i.id),
                      quantity: i.quantity,
                      price: i.price,
                    })),
                    total: grandTotal,
                    tax,
                    shippingAddress,
                    paystackRef: response.reference,
                  }),
                });

                clearCart();
                toast.success('Payment successful!', { description: 'Your order has been placed.' });
                navigate('/dashboard/orders');
              } else {
                toast.error('Payment verification failed');
              }
            } catch {
              toast.error('Error processing order');
            } finally {
              setIsProcessing(false);
            }
          },
        });
        popup.openIframe();
      };
    } catch (err: any) {
      toast.error('Checkout failed', { description: err.message });
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Link>
      </motion.div>

      <motion.h1
        className="text-4xl font-bold mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Checkout
      </motion.h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-lg shadow-primary/5">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-primary/5">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <Input
                placeholder="Enter your full shipping address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="bg-muted/50"
              />
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 border-0 shadow-xl shadow-primary/10 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-purple-600 p-4">
              <h2 className="text-xl font-bold text-white">Payment Summary</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-emerald-600 font-medium">Free</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="gradient-text">{formatCurrency(grandTotal)}</span>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Pay with Paystack</>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secure payment via Paystack
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
