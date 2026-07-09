import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../data/products';
import { useAuth } from './AuthContext';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const { user, token } = useAuth();

  // Sync from API when user logs in
  useEffect(() => {
    if (user && token) {
      fetch(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : [])
        .then((serverItems: any[]) => {
          if (serverItems.length > 0) {
            const mapped: CartItem[] = serverItems.map((i: any) => ({
              id: String(i.product_id),
              name: i.name,
              category: i.category,
              price: i.price,
              description: i.description,
              image: i.image,
              specs: JSON.parse(i.specs),
              stock: i.stock,
              rating: i.rating,
              quantity: i.quantity,
            }));
            // Merge: keep local items not on server, then add server items
            const localOnly = items.filter(li => !mapped.some(si => si.id === li.id));
            const merged = [...mapped, ...localOnly];
            setItems(merged);
            saveToStorage(merged);
          }
        })
        .catch(() => {});
    }
  }, [user, token]);

  // Save to localStorage on every change
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addToCart = (product: Product) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);
      const newItems = existingItem
        ? currentItems.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...currentItems, { ...product, quantity: 1 }];

      // Sync to API if logged in
      if (user && token) {
        fetch(`${API_URL}/api/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: Number(product.id), quantity: 1 }),
        }).catch(() => {});
      }

      return newItems;
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
    if (user && token) {
      fetch(`${API_URL}/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
    if (user && token) {
      fetch(`${API_URL}/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity }),
      }).catch(() => {});
    }
  };

  const clearCart = () => {
    setItems([]);
    if (user && token) {
      fetch(`${API_URL}/api/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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
