import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Store, CheckCircle2, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { categories } from '../data/categories';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

interface SellerFormData { fullName: string; phone: string; description: string; category: string; }

export function SellerRegistrationPage() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SellerFormData>();
  const onSubmit = async (data: SellerFormData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.id, 'seller_requests'), {
        ...data, email: user.email, user_id: user.id, status: 'pending', created_at: serverTimestamp(),
      });
      setSubmitted(true);
    } catch { toast.error('Could not submit your application. Please try again.'); }
  };
  if (submitted) return <div className="container mx-auto px-4 py-16 text-center max-w-xl space-y-6">
    <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
    <h1 className="text-3xl font-bold">Application received</h1>
    <p className="text-muted-foreground">Your seller application has been saved for review. Your account will be enabled for selling after approval.</p>
    <Link to="/products"><Button>Explore the Marketplace</Button></Link>
  </div>;
  return <div>
    <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-12 text-center space-y-4">
      <Store className="h-12 w-12 mx-auto" /><h1 className="text-4xl font-bold">Sell on Jack of All Trades</h1>
      <p className="text-white/85 max-w-2xl mx-auto">Dresses, calculators, appliances, home goods, phones, or your next great find. Tell us what you would like to sell.</p>
    </div>
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-6"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
      <Card className="border-0 shadow-xl shadow-primary/10"><CardContent className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-2">Apply to become a seller</h2>
        <p className="text-muted-foreground mb-7">Applications are reviewed before listings are published. No payment is collected by this form.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" defaultValue={user?.name}
            {...register('fullName', { required: 'Enter your name', maxLength: 120 })} />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}</div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={user?.email || ''} disabled /></div>
          <div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel"
            {...register('phone', { required: 'Enter a phone number', maxLength: 40 })} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}</div>
          <div className="space-y-2"><Label htmlFor="category">Main product category</Label>
            <select id="category" className="w-full border rounded-md px-3 py-2 bg-background" {...register('category')}>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select></div>
          <div className="space-y-2"><Label htmlFor="description">What would you like to sell?</Label>
            <Textarea id="description" rows={4} placeholder="Tell us about your products, including any categories not listed above."
              {...register('description', { required: 'Describe your products', maxLength: 3000 })} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}</div>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit seller application'}</Button>
        </form>
      </CardContent></Card>
    </div>
  </div>;
}
