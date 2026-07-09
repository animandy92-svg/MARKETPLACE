import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: string;
}

export function WishlistButton({ productId }: WishlistButtonProps) {
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.id, 'wishlist', productId)).then((snap) => {
      setIsWishlisted(snap.exists());
    }).catch(() => {});
  }, [user, productId]);

  const toggle = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }

    const wishlistRef = doc(db, 'users', user.id, 'wishlist', productId);

    if (isWishlisted) {
      await deleteDoc(wishlistRef);
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      await setDoc(wishlistRef, {
        product_id: productId,
        created_at: serverTimestamp(),
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
