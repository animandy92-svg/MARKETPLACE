import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Product } from '../data/products';
import { toast } from 'sonner';

interface CartItem extends Product { quantity: number; }
interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_KEY = 'marketplace_guest_cart_v2';
function loadGuest(): CartItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(data) ? data.filter((item) => typeof item.id === 'string'
      && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) : [];
  } catch { return []; }
}
function saveGuest(items: CartItem[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(items)); } catch { /* Storage may be disabled. */ }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadGuest);
  const { user } = useAuth();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe = () => {};
    setItems(user ? [] : loadGuest());
    if (!user) return () => { active = false; };
    const cartRef = collection(db, 'users', user.id, 'cart');
    async function connect() {
      const guest = loadGuest();
      for (const item of guest) {
        const ref = doc(cartRef, item.id);
        await runTransaction(db, async (transaction) => {
          const existing = await transaction.get(ref);
          const quantity = Math.min(99, (existing.data()?.quantity || 0) + item.quantity);
          transaction.set(ref, { quantity });
        });
      }
      saveGuest([]);
      if (!active) return;
      unsubscribe = onSnapshot(cartRef, async (snapshot) => {
        const currentRevision = ++revision;
        try {
          const loaded = await Promise.all(snapshot.docs.map(async (entry) => {
            const product = await getDoc(doc(db, 'products', entry.id));
            return product.exists() ? { id: product.id, ...product.data(), quantity: entry.data().quantity } as CartItem : null;
          }));
          if (active && currentRevision === revision) setItems(loaded.filter((item): item is CartItem => item !== null));
        } catch { if (active) toast.error('Could not load your cart'); }
      }, () => { if (active) toast.error('Could not sync your cart'); });
    }
    connect().catch(() => { if (active) toast.error('Could not sync your cart'); });
    return () => { active = false; unsubscribe(); };
  }, [user?.id]);
  useEffect(() => { if (!user) saveGuest(items); }, [items, user?.id]);
  const report = () => toast.error('Could not update your cart. Please try again.');
  const addToCart = (product: Product) => {
    if (product.verified !== true) { toast.error('This item needs a stock check before ordering'); return; }
    if (product.stock <= 0) { toast.error('This product is out of stock'); return; }
    if (user) {
      const ref = doc(db, 'users', user.id, 'cart', product.id);
      runTransaction(db, async (transaction) => {
        const existing = await transaction.get(ref);
        const quantity = Math.min(99, product.stock, (existing.data()?.quantity || 0) + 1);
        transaction.set(ref, { quantity });
      }).catch(report);
    } else {
      setItems((current) => {
        const existing = current.find((item) => item.id === product.id);
        return existing ? current.map((item) => item.id === product.id
          ? { ...item, quantity: Math.min(99, product.stock, item.quantity + 1) } : item)
          : [...current, { ...product, quantity: 1 }];
      });
    }
  };
  const removeFromCart = (productId: string) => {
    if (user) deleteDoc(doc(db, 'users', user.id, 'cart', productId)).catch(report);
    else setItems((current) => current.filter((item) => item.id !== productId));
  };
  const updateQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) { removeFromCart(productId); return; }
    const product = items.find((item) => item.id === productId);
    const bounded = Math.min(99, product?.stock || 99, quantity);
    if (user) setDoc(doc(db, 'users', user.id, 'cart', productId), { quantity: bounded }).catch(report);
    else setItems((current) => current.map((item) => item.id === productId ? { ...item, quantity: bounded } : item));
  };
  const clearCart = () => {
    if (user) {
      getDocs(collection(db, 'users', user.id, 'cart')).then(async (snapshot) => {
        const batch = writeBatch(db);
        snapshot.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
      }).catch(report);
    } else setItems([]);
  };
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
