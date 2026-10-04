import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { apiRequest } from '../lib/api';
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

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [serviceReady, setServiceReady] = useState(false);
  const verifiedReference = useRef<string | null>(null);

  useEffect(() => {
    apiRequest('/health').then((data) => { setPaymentsEnabled(data.paymentsEnabled); setServiceReady(true); })
      .catch(() => toast.error('Checkout service is unavailable. Please try again later.'));
  }, []);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!user || !reference || verifiedReference.current === reference) return;
    verifiedReference.current = reference;
    setIsProcessing(true);
    apiRequest(`/payments/verify/${encodeURIComponent(reference)}`).then(() => {
      toast.success('Payment verified. Your order has been placed.');
      navigate('/dashboard/orders', { replace: true });
    }).catch((err) => { verifiedReference.current = null; toast.error(err.message); })
      .finally(() => setIsProcessing(false));
  }, [user]);

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
    if (!user) {
      toast.error('Please sign in to checkout');
      return;
    }

    setIsProcessing(true);
    try {
      const body = {
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        shippingAddress,
      };
      if (paymentsEnabled) {
        const payment = await apiRequest('/payments/initialize', body);
        window.location.assign(payment.authorization_url);
      } else {
        await apiRequest('/orders', body);
        clearCart();
        toast.success('Order request submitted', { description: 'This order is unpaid and awaiting confirmation.' });
        navigate('/dashboard/orders');
      }
    } catch (err: any) {
      toast.error('Checkout failed', { description: err.message });
    } finally {
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

      <motion.h1 className="text-4xl font-bold mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Checkout
      </motion.h1>

      <div className="grid lg:grid-cols-3 gap-8">
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
              <Input placeholder="Enter your full shipping address" value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)} className="bg-muted/50" />
            </CardContent>
          </Card>
        </div>

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

              <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20"
                size="lg" onClick={handleCheckout} disabled={isProcessing || !serviceReady}>
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> {paymentsEnabled ? 'Pay with Paystack' : 'Submit unpaid order'}</>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {paymentsEnabled ? 'Secure payment via Paystack' : 'Payment will be arranged after your order is confirmed'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
