import { useEffect, useState } from 'react';
import { collection, doc, runTransaction, serverTimestamp, getDocs } from 'firebase/firestore';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { compressPhoto } from '../lib/photo';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/categories';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function ListingEditor({ listing, admin = false, onClose, onSaved }: { listing?: any; admin?: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: listing?.name || '', category: listing?.category || 'phone', price: String(listing?.price || ''),
    stock: String(listing?.stock ?? 1), description: listing?.description || '', image: listing?.image || '', specs: (listing?.specs || []).join('\n'),
    condition: listing?.condition || 'new', sellerId: listing?.seller_id || '', active: listing?.active !== false, cost: '' });
  const [suppliers, setSuppliers] = useState<any[]>([]), [checked, setChecked] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (admin) getDocs(collection(db, 'seller_profiles')).then(snap => setSuppliers(snap.docs.filter(d => d.data().status === 'approved').map(d => ({ id: d.id, ...d.data() })))); }, [admin]);
  const field = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  async function photo(file?: File) {
    if (!file) return;
    setBusy(true);
    try { field('image', await compressPhoto(file)); toast.success('Photo ready'); }
    catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(form.price), stock = Number(form.stock);
    if (!form.name.trim() || !form.description.trim() || !Number.isFinite(price) || price <= 0 || price > 1000000 || !Number.isInteger(stock) || stock < 0 || stock > 100000 || !form.image || form.image.length > 500000) { toast.error('Complete the details and add a photo'); return; }
    if (admin && !checked) { toast.error('Confirm your listing checks first'); return; }
    if (!user) return;
    setBusy(true);
    try {
      const ref = listing?.id ? doc(db, admin ? 'products' : 'listing_submissions', listing.id) : doc(collection(db, admin ? 'products' : 'listing_submissions'));
      await runTransaction(db, async tx => {
        const snap = await tx.get(ref), existing = snap.data();
        if (admin && (existing?.reserved || 0) > 0) throw new Error('Stock is reserved for a pending order. Finish or cancel that order before editing.');
        tx.set(ref, { name: form.name.trim(), category: form.category, price: Math.round(price * 100) / 100, stock,
          description: form.description.trim(), image: form.image, specs: form.specs.split('\n').map((s: string) => s.trim()).filter(Boolean).slice(0,30),
          condition: form.condition, seller_id: admin ? (form.sellerId || existing?.seller_id || user.id) : user.id,
          active: admin && form.active, status: admin ? (form.active ? 'active' : 'hidden') : 'pending', verified: admin,
          rating: existing?.rating || 0, review_count: existing?.review_count || 0, review_sum: existing?.review_sum || 0,
          created_at: existing?.created_at || serverTimestamp(), updated_at: serverTimestamp() }, { merge: true });
        if (admin && form.cost !== '') {
          const cost = Number(form.cost);
          if (!Number.isFinite(cost) || cost < 0) throw new Error('Supplier cost must be zero or greater');
          tx.set(doc(db, 'product_costs', ref.id), { cost });
        }
      });
      toast.success(admin ? 'Listing saved' : 'Submitted for review'); onSaved();
    } catch (err: any) { toast.error(err.message || 'Could not save the listing'); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="bg-white border rounded-2xl p-6 space-y-5">
    <div><h2 className="text-xl font-bold">{listing ? 'Update your find' : 'Add a new find'}</h2><p className="text-sm text-muted-foreground mt-1">{admin ? 'Check every item before publishing.' : 'Your listing will go live after the team checks it.'}</p></div>
    <div className="grid sm:grid-cols-2 gap-5">
      <label className="text-sm space-y-2">Item name<Input required maxLength={180} value={form.name} onChange={e => field('name', e.target.value)} /></label>
      <label className="text-sm space-y-2">Category<select className="w-full border rounded-md p-2 bg-background" value={form.category} onChange={e => field('category',e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm space-y-2">Price (GHS)<Input required type="number" min="0.01" max="1000000" step="0.01" value={form.price} onChange={e => field('price',e.target.value)} /></label>
      <label className="text-sm space-y-2">Available stock<Input required type="number" min="0" max="100000" step="1" value={form.stock} onChange={e => field('stock',e.target.value)} /></label>
      <label className="text-sm space-y-2">Condition<select className="w-full border rounded-md p-2 bg-background" value={form.condition} onChange={e => field('condition',e.target.value)}><option value="new">New</option><option value="like-new">Like new</option><option value="used">Used</option></select></label>
      {admin && <label className="text-sm space-y-2">Supplier cost (GHS, private)<Input type="number" min="0" step="0.01" placeholder="Leave empty to keep the saved cost" value={form.cost} onChange={e => field('cost',e.target.value)} /></label>}
      {admin && <label className="text-sm space-y-2 sm:col-span-2">Supplier<select className="w-full border rounded-md p-2 bg-background" value={form.sellerId} onChange={e => field('sellerId',e.target.value)}><option value="">Marketplace managed</option>{suppliers.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>}
      <label className="text-sm space-y-2 sm:col-span-2">Description<Textarea required maxLength={5000} value={form.description} onChange={e => field('description',e.target.value)} placeholder="Describe what is included. Be clear about wear or defects." /></label>
      <div className="space-y-3"><p className="text-sm font-medium">Product photo</p><label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/25 p-5 cursor-pointer hover:bg-primary/5">
        {form.image ? <img src={form.image} className="h-32 w-full object-contain rounded-lg" alt="Listing photo preview" /> : <Camera className="h-9 w-9 text-primary" />}<span className="text-sm text-primary font-semibold">{busy ? 'Preparing photo…' : 'Take or choose a photo'}</span><input aria-label="Upload product photo" className="w-full text-xs" type="file" accept="image/*" disabled={busy} onChange={e => photo(e.target.files?.[0])} /></label><p className="text-xs text-muted-foreground">Photos are resized automatically for quick loading. Use your own clear photo of the actual item.</p></div>
      <label className="text-sm space-y-2">Item details, one per line<Textarea rows={6} value={form.specs} onChange={e => field('specs',e.target.value)} placeholder="Storage: 128 GB&#10;Battery condition: Good&#10;Includes: Charger" /></label>
    </div>
    {admin && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => field('active', e.target.checked)} /> Show this item for sale</label><label className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1" /><span><CheckCircle2 className="w-4 inline mr-2 text-primary" />I checked stock, actual photos, condition, supplier reliability, and pricing.</span></label></>}
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="w-4 animate-spin mr-2" /> : null}{admin ? 'Save listing' : 'Submit for review'}</Button></div>
  </form>;
}
