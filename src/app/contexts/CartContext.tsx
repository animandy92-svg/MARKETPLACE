import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Product } from '../data/products';

interface CartItem extends Product {
  quantity: number;
}

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

function loadFromStorage(): CartItem[] {
  try {
    const data = localStorage.getItem('cart_items');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  localStorage.setItem('cart_items', JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);
  const { user } = useAuth();

  // Sync from Firestore when user logs in
  useEffect(() => {
    if (user) {
      const cartRef = collection(db, 'users', user.id, 'cart');
      getDocs(cartRef).then((snapshot) => {
        if (!snapshot.empty) {
          const firestoreItems: CartItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || '',
              category: data.category || 'accessory',
              price: data.price || 0,
              description: data.description || '',
              image: data.image || '',
              specs: data.specs || [],
              stock: data.stock || 0,
              rating: data.rating || 0,
              quantity: data.quantity || 1,
            };
          });
          // Merge with local items
          const localOnly = items.filter((li) => !firestoreItems.some((fi) => fi.id === li.id));
          const merged = [...firestoreItems, ...localOnly];
          setItems(merged);
          saveToStorage(merged);
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addToCart = (product: Product) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === product.id);
      const newItems = existing
        ? currentItems.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...currentItems, { ...product, quantity: 1 }];

      // Sync to Firestore
      if (user) {
        const cartDoc = doc(db, 'users', user.id, 'cart', product.id);
        const qty = existing ? existing.quantity + 1 : 1;
        setDoc(cartDoc, {
          quantity: qty,
          name: product.name,
          category: product.category,
          price: product.price,
          description: product.description,
          image: product.image,
          specs: product.specs,
          stock: product.stock,
          rating: product.rating,
        }).catch(() => {});
      }

      return newItems;
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
    if (user) {
      deleteDoc(doc(db, 'users', user.id, 'cart', productId)).catch(() => {});
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === productId ? { ...item, quantity } : item))
    );
    if (user) {
      setDoc(doc(db, 'users', user.id, 'cart', productId), { quantity }, { merge: true }).catch(() => {});
    }
  };

  const clearCart = () => {
    setItems([]);
    if (user) {
      const cartRef = collection(db, 'users', user.id, 'cart');
      getDocs(cartRef).then((snap) => {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        batch.commit().catch(() => {});
      }).catch(() => {});
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
