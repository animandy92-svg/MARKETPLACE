import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface WishlistButtonProps {
  productId: string;
}

export function WishlistButton({ productId }: WishlistButtonProps) {
  const { user, token } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    fetch(`${API_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((items: any[]) => {
        setIsWishlisted(items.some(i => String(i.product_id) === productId));
      })
      .catch(() => {});
  }, [user, token, productId]);

  const toggle = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }

    if (isWishlisted) {
      await fetch(`${API_URL}/api/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      await fetch(`${API_URL}/api/wishlist/${productId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsWishlisted(true);
      toast.success('Added to wishlist');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
    >
      <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
    </Button>
  );
}
