import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowLeft, Store, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

interface SellerFormData {
  fullName: string;
  email: string;
  phone: string;
  description: string;
}

const REGISTRATION_FEE = 50;

export function SellerRegistrationPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerFormData>();

  const onSubmit = (data: SellerFormData) => {
    console.log('Seller registration:', data);
    setSubmitted(true);
    toast.success('Registration successful!', {
      description: `Welcome ${data.fullName}! You can now start listing your products.`,
    });
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">You're All Set!</h1>
          <p className="text-muted-foreground">
            Your seller account has been created. You can now start listing your products on the marketplace.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/products">
              <Button>Browse Marketplace</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Link>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Sell on Jack of all Trades</h1>
          <p className="text-muted-foreground text-lg">
            Join our marketplace and reach thousands of customers
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6">Your Information</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Kwame Asante"
                      {...register('fullName', { required: 'Full name is required' })}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="kwame@example.com"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Please enter a valid email',
                        },
                      })}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+233 24 000 0000"
                      {...register('phone', { required: 'Phone number is required' })}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">What do you sell?</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell us about the products you plan to sell..."
                      rows={4}
                      {...register('description', {
                        required: 'Please describe what you sell',
                      })}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Register & Pay {formatCurrency(REGISTRATION_FEE)}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Fee Summary */}
          <div className="md:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Registration Fee</h3>
                <Separator />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seller account</span>
                    <span>{formatCurrency(REGISTRATION_FEE)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Listing privileges</span>
                    <span className="text-green-600">Included</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dashboard access</span>
                    <span className="text-green-600">Included</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(REGISTRATION_FEE)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  One-time fee. No recurring charges.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
