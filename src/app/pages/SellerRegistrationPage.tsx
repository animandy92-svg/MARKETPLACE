import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Store, CheckCircle2, Sparkles } from 'lucide-react';
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold">You're All Set!</h1>
          <p className="text-muted-foreground">
            Your seller account has been created. You can now start listing your products on the marketplace.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/products">
              <Button className="bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/20">
                Browse Marketplace
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 py-12 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="container mx-auto relative z-10">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center"
            >
              <Store className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-2">Sell on Jack of all Trades</h1>
            <p className="text-white/80 text-lg">
              Join our marketplace and reach thousands of customers
            </p>
          </motion.div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Registration Form */}
            <div className="md:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Card className="border-0 shadow-xl shadow-primary/10">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-6">Your Information</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                      >
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="Kwame Asante"
                          className="bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                          {...register('fullName', { required: 'Full name is required' })}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">{errors.fullName.message}</p>
                        )}
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="kwame@example.com"
                          className="bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
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
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                      >
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+233 24 000 0000"
                          className="bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                          {...register('phone', { required: 'Phone number is required' })}
                        />
                        {errors.phone && (
                          <p className="text-sm text-destructive">{errors.phone.message}</p>
                        )}
                      </motion.div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.3 }}
                      >
                        <Label htmlFor="description">What do you sell?</Label>
                        <Textarea
                          id="description"
                          placeholder="Tell us about the products you plan to sell..."
                          rows={4}
                          className="bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                          {...register('description', {
                            required: 'Please describe what you sell',
                          })}
                        />
                        {errors.description && (
                          <p className="text-sm text-destructive">{errors.description.message}</p>
                        )}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                      >
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Register & Pay {formatCurrency(REGISTRATION_FEE)}
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Fee Summary */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Card className="sticky top-20 border-0 shadow-xl shadow-primary/10 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-purple-600 p-4">
                    <h3 className="text-lg font-semibold text-white">Registration Fee</h3>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Seller account</span>
                        <span className="font-medium">{formatCurrency(REGISTRATION_FEE)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Listing privileges</span>
                        <span className="text-emerald-600 font-medium">Included</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dashboard access</span>
                        <span className="text-emerald-600 font-medium">Included</span>
                      </div>
                    </div>

                    <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="gradient-text">{formatCurrency(REGISTRATION_FEE)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      One-time fee. No recurring charges.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
