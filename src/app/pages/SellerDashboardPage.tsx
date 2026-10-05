import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Store, Plus, Camera } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ListingEditor } from '../components/ListingEditor';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../utils/formatCurrency';
import { apiRequest } from '../lib/api';
import { toast } from 'sonner';

export function SellerDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null), [loaded, setLoaded] = useState(false), [listings, setListings] = useState<any[]>([]), [drafts, setDrafts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(undefined), [orders, setOrders] = useState<any[]>([]), [orderError, setOrderError] = useState(false);
  useEffect(() => { if (!user) return; return onSnapshot(doc(db,'seller_profiles',user.id), snap => { setProfile(snap.data()); setLoaded(true); }, () => setLoaded(true)); }, [user?.id]);
  useEffect(() => {
    if (!user || profile?.status !== 'approved') return;
    const stops = [onSnapshot(query(collection(db,'products'),where('seller_id','==',user.id)), snap => setListings(snap.docs.map(d => ({ id:d.id,...d.data() })))),
      onSnapshot(query(collection(db,'listing_submissions'),where('seller_id','==',user.id)), snap => setDrafts(snap.docs.map(d => ({ id:d.id,...d.data() }))))];
    apiRequest('/seller/dashboard').then(data => { setOrders(data.orders); setOrderError(false); }).catch(() => setOrderError(true));
    return () => stops.forEach(stop => stop());
  }, [user?.id, profile?.status]);
  if (!loaded) return <p className="container mx-auto p-12">Loading seller workspace…</p>;
  if (profile?.status !== 'approved') return <div className="container mx-auto p-12 max-w-xl space-y-5 text-center"><Store className="w-12 h-12 mx-auto text-primary" /><h1 className="text-3xl font-bold">Your seller workspace</h1><p className="text-muted-foreground">{profile ? `Your application is ${profile.status}. Contact support if you have questions.` : 'Apply to join our supplier shortlist. The team reviews sellers before enabling listings.'}</p><Link to="/sell"><Button>Apply to sell</Button></Link><Link className="block underline text-primary" to="/help">Talk to the team</Link></div>;
  const combined = [...drafts, ...listings.filter(l => !drafts.some(d => d.id === l.id))];
  return <div className="container mx-auto px-4 py-10 space-y-7"><div className="flex flex-wrap gap-4 justify-between items-center"><div><p className="eyebrow">YOUR SELLER WORKSPACE</p><h1 className="text-3xl font-bold mt-2">Hello, {profile.name}.</h1><p className="text-muted-foreground mt-2">Photos, stock, and orders. All in one place.</p></div><Button onClick={() => setEditing(null)}><Plus className="w-4 mr-2" />Add a find</Button></div>
    {editing !== undefined && <ListingEditor key={editing?.id || 'new'} listing={editing} onClose={() => setEditing(undefined)} onSaved={() => setEditing(undefined)} />}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{combined.map(l => <div className="bg-white border rounded-2xl p-4" key={l.id}><img className="w-full h-44 object-contain bg-muted rounded-xl" src={l.image} alt={l.name} /><h2 className="font-bold mt-4">{l.name}</h2><p className="text-sm text-muted-foreground mt-1">{formatCurrency(l.price)} · {l.stock} available</p><p className="text-xs text-primary mt-2">{l.status === 'pending' ? 'Awaiting review' : l.status === 'published' ? 'Published · edits need another review' : l.status}</p><Button className="mt-4" variant="outline" size="sm" onClick={() => setEditing(l)}>Update photo, details or stock</Button></div>)}</div>
    {!combined.length && <div className="policy-panel text-center"><Camera className="mx-auto text-primary mb-3" /><h2 className="font-bold">Let’s add your first find</h2><p className="text-sm text-muted-foreground mt-2">Choose a photo from your phone. Add honest details and the quantity you have.</p></div>}
    <section className="space-y-4"><h2 className="text-2xl font-bold">Orders to prepare</h2>{orderError ? <p className="text-sm text-muted-foreground">Order handling opens when the checkout API is deployed. Your listings and applications work now.</p> : orders.length ? orders.map(o => <div key={o.id} className="policy-panel"><p className="font-bold">#{o.id.slice(0,8)} · {o.status.replaceAll('_',' ')}</p>{o.items.map((l:any) => <p key={l.product_id} className="text-sm mt-2">{l.name} × {l.quantity}</p>)}<Button className="mt-4" size="sm" disabled={o.ready || !['paid','processing'].includes(o.status)} onClick={async () => { try { await apiRequest('/seller/ready',{ orderId:o.id,customerId:o.uid }); setOrders(prev => prev.map(item => item.id === o.id ? {...item,ready:true}:item)); toast.success('Marked ready for the team'); } catch(e:any) { toast.error(e.message); } }}>{o.ready ? 'Ready for collection' : 'Mark ready for collection'}</Button></div>) : <p className="text-muted-foreground text-sm">No paid orders to prepare yet.</p>}</section>
  </div>;
}
