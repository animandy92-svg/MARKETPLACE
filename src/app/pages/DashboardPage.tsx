import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Trash2, Loader2, Package, User, Settings } from 'lucide-react';
import { collection, getDocs, getDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CustomerOrder } from '../components/CustomerOrder';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

interface Order {
  id: string;
  total: number;
  tax: number;
  status: string;
  shipping_address: string;
  created_at: any;
  items?: any[];
}

interface WishlistItem {
  product_id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getDocs(collection(db, 'users', user.id, 'wishlist')).then(async (snap) => {
        const items: WishlistItem[] = [];
        for (const d of snap.docs) {
          const product = await getDoc(doc(db, 'products', d.id));
          if (!product.exists()) continue;
          const data = product.data();
          items.push({
            product_id: d.id,
            name: data.name || '',
            price: data.price || 0,
            image: data.image || '',
            category: data.category || '',
          });
        }
        return items;
      }).then((wishlistData) => {
      if (cancelled) return;
      setWishlist(wishlistData || []);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  useEffect(() => { setOrders([]); if (!user) return; return onSnapshot(query(collection(db,'users',user.id,'orders'),orderBy('created_at','desc')),snap=>setOrders(snap.docs.map(d=>({id:d.id,...d.data()})) as Order[]), () => toast.error('Could not load orders')); }, [user?.id]);

  const handleRemoveWishlist = async (productId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.id, 'wishlist', productId));
    setWishlist((prev) => prev.filter((i) => i.product_id !== productId));
    toast.success('Removed from wishlist');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { name, phone });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h1 className="text-4xl font-bold mb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        My Dashboard
      </motion.h1>
      <p className="text-muted-foreground mb-8">Welcome back, {user?.name}</p>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2"><Heart className="h-4 w-4" /> Wishlist</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">Start shopping to see your orders here.</p>
                <Link to="/products">
                  <Button className="bg-gradient-to-r from-primary to-emerald-800">Browse Products</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <CustomerOrder key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wishlist">
          {wishlist.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold mb-2">Wishlist is empty</h3>
                <p className="text-muted-foreground mb-4">Save items you love for later.</p>
                <Link to="/products">
                  <Button className="bg-gradient-to-r from-primary to-emerald-800">Browse Products</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((item) => (
                <Card key={item.product_id} className="border-0 shadow-lg shadow-primary/5 overflow-hidden">
                  <div className="h-48 bg-muted">
                    <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <Link to={`/product/${item.product_id}`} className="font-bold hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                    <p className="text-primary font-bold mt-1">{formatCurrency(item.price)}</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveWishlist(item.product_id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-0 shadow-lg max-w-lg">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." className="mt-1" />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-to-r from-primary to-emerald-800">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
