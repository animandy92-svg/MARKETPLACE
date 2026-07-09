import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import logoSvg from '../../assets/logo.svg';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset email sent', { description: 'Check your inbox for the password reset link.' });
    } catch (err: any) {
      toast.error('Failed to send reset email', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-purple-600 py-6 px-6 text-center">
            <img src={logoSvg} alt="Jack of all Trades" className="h-14 w-auto mx-auto mb-3 brightness-0 invert" />
            <h2 className="text-xl font-bold text-white">Reset Password</h2>
            <p className="text-white/80 text-sm">We'll send you a reset link</p>
          </div>

          <CardContent className="p-6">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">📧</div>
                <p className="text-muted-foreground">Check <strong>{email}</strong> for the reset link.</p>
                <Button variant="outline" onClick={() => navigate('/signin')}>Back to Sign In</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-muted/50 border-0"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center bg-muted/30 py-4">
            <Link to="/signin" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
