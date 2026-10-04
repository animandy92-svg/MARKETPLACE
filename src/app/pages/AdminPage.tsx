import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Plus, Pencil, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { categories, categoryLabel } from '../data/categories';
import { Product } from '../data/products';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

type Listing = Product & { active?: boolean; status?: string };
const empty = { name: '', category: 'fashion', price: '', stock: '1', description: '', image: '', specs: '', active: true };

export function AdminPage() {
  const { isAdmin, firebaseUser, signOut } = useAuth();
  const [products, setProducts] = useState<Listing[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Listing[]);
    }, () => toast.error('Could not load listings'));
  }, [isAdmin]);
  if (!isAdmin) return <div className="container mx-auto px-4 py-16 max-w-xl text-center space-y-5">
    <ShieldCheck className="h-14 w-14 text-primary mx-auto" /><h1 className="text-3xl font-bold">Admin access</h1>
    <p className="text-muted-foreground">Signed in as {firebaseUser?.email}. This account needs an approved admin role to manage listings.</p>
    <div className="flex justify-center gap-3"><Button onClick={async () => { await firebaseUser?.getIdToken(true); window.location.reload(); }}>Refresh access</Button>
      <Button variant="outline" onClick={signOut}>Use another account</Button></div>
  </div>;
  const edit = (product?: Listing) => {
    setEditing(product?.id || null);
    setForm(product ? { name: product.name, category: product.category, price: String(product.price), stock: String(product.stock),
      description: product.description, image: product.image, specs: (product.specs || []).join('\n'), active: product.active !== false && product.status !== 'sold' } : empty);
    setShowForm(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(form.price), stock = Number(form.stock);
    if (!form.name.trim() || !form.description.trim() || !Number.isFinite(price) || price <= 0
      || !Number.isInteger(stock) || stock < 0) { toast.error('Enter a name, description, valid price, and whole-number stock.'); return; }
    if (form.image && !/^https:\/\//i.test(form.image.trim())) { toast.error('Use an HTTPS image URL.'); return; }
    setBusy(true);
    try {
      const data = { name: form.name.trim(), category: form.category, price, stock,
        description: form.description.trim(), image: form.image.trim(), specs: form.specs.split('\n').map((s) => s.trim()).filter(Boolean),
        active: form.active, status: form.active ? 'active' : 'sold', updated_at: serverTimestamp() };
      if (editing) await updateDoc(doc(db, 'products', editing), data);
      else await addDoc(collection(db, 'products'), { ...data, rating: 0, created_at: serverTimestamp() });
      setShowForm(false); toast.success(editing ? 'Listing updated' : 'Listing published');
    } catch { toast.error('Could not save the listing. Please try again.'); }
    finally { setBusy(false); }
  };
  const sold = async (product: Listing) => {
    try { await updateDoc(doc(db, 'products', product.id), { status: 'sold', active: false, stock: 0, updated_at: serverTimestamp() });
      toast.success('Marked sold and removed from the storefront'); }
    catch { toast.error('Could not update the listing'); }
  };
  const remove = async (product: Listing) => {
    if (!window.confirm(`Remove "${product.name}" from the marketplace? This cannot be undone.`)) return;
    try { await deleteDoc(doc(db, 'products', product.id)); toast.success('Listing removed'); }
    catch { toast.error('Could not remove the listing'); }
  };
  const visible = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="container mx-auto px-4 py-8 space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div>
      <p className="text-primary text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Admin panel</p>
      <h1 className="text-3xl font-bold mt-2">Manage your marketplace</h1>
      <p className="text-muted-foreground mt-2">Add items, update details, and remove sold goods. Changes appear across the website and app.</p>
    </div><Button onClick={() => edit()}><Plus className="h-4 w-4 mr-2" /> Add item</Button></div>
    {showForm && <Card className="border-primary/20"><CardContent className="p-6">
      <h2 className="text-xl font-bold mb-5">{editing ? 'Edit item' : 'Add a new item'}</h2>
      <form onSubmit={save} className="grid md:grid-cols-2 gap-5">
        <div className="space-y-2"><Label htmlFor="itemName">Item name</Label><Input id="itemName" required maxLength={180} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="itemCategory">Category</Label><select id="itemCategory" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-background">
          {!categories.some((category) => category.id === form.category) && <option value={form.category}>{form.category}</option>}
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="itemPrice">Price (Ghana cedis)</Label><Input id="itemPrice" type="number" required min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="itemStock">Quantity available</Label><Input id="itemStock" type="number" required min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="itemDescription">Description</Label><Textarea id="itemDescription" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="itemImage">Image URL (optional)</Label><Input id="itemImage" type="url" placeholder="https://…" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /><p className="text-xs text-muted-foreground">Paste a link to your product photo.</p></div>
        <div className="space-y-2"><Label htmlFor="itemDetails">Item details (one per line)</Label><Textarea id="itemDetails" placeholder="Size: Medium\nColor: Blue" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Show this item for sale</label>
        <div className="flex gap-3 md:justify-end"><Button type="button" variant="outline" disabled={busy} onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish item'}</Button></div>
      </form>
    </CardContent></Card>}
    <Input aria-label="Search listings" placeholder="Search your listings…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
    <div className="space-y-3">{visible.map((product) => <Card key={product.id}><CardContent className="p-4 flex flex-wrap gap-4 items-center">
      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden"><ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" /></div>
      <div className="flex-1 min-w-40"><h2 className="font-bold">{product.name}</h2><p className="text-sm text-muted-foreground">{categoryLabel(product.category)} · {formatCurrency(product.price)} · {product.stock} available</p>
        <p className="text-xs mt-1 text-primary">{product.status === 'sold' || product.active === false ? 'Hidden / sold' : 'For sale'}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => edit(product)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
        <Button variant="outline" size="sm" disabled={product.status === 'sold'} onClick={() => sold(product)}><CheckCircle2 className="h-4 w-4 mr-1" /> Sold</Button>
        <Button variant="destructive" size="sm" onClick={() => remove(product)}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button></div>
    </CardContent></Card>)}{visible.length === 0 && <p className="text-muted-foreground py-8">No listings found. Add your first item above.</p>}</div>
  </div>;
}
