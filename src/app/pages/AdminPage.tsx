import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Plus, ShieldCheck, Pencil, EyeOff, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { categoryLabel } from '../data/categories';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ListingEditor } from '../components/ListingEditor';
import { PilotSettings, SupplierReview, OrderOperations } from '../components/MarketplaceOperations';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

export function AdminPage() {
  const { isAdmin, firebaseUser, signOut } = useAuth();
  const [products,setProducts]=useState<any[]>([]),[editing,setEditing]=useState<any>(undefined),[search,setSearch]=useState('');
  useEffect(()=>{if(!isAdmin)return;return onSnapshot(collection(db,'products'),snap=>setProducts(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>toast.error('Could not load catalog'));},[isAdmin]);
  if(!isAdmin)return <div className="container mx-auto px-4 py-16 max-w-xl text-center space-y-5"><ShieldCheck className="h-14 w-14 text-primary mx-auto"/><h1 className="text-3xl font-bold">Admin access</h1><p className="text-muted-foreground">Signed in as {firebaseUser?.email}. This account needs an approved admin role.</p><div className="flex justify-center gap-3"><Button onClick={async()=>{await firebaseUser?.getIdToken(true);window.location.reload();}}>Refresh access</Button><Button variant="outline" onClick={signOut}>Use another account</Button></div></div>;
  async function change(product:any,remove=false){
    if(remove&&!window.confirm(`Permanently remove ${product.name}? Order records are kept.`))return;
    try{await runTransaction(db,async tx=>{const ref=doc(db,'products',product.id),snap=await tx.get(ref);if((snap.data()?.reserved||0)>0)throw new Error('This stock is reserved. Finish or cancel pending orders first.');if(remove)tx.delete(ref);else tx.update(ref,{active:false,status:'hidden',updated_at:serverTimestamp()});});toast.success(remove?'Listing removed':'Listing hidden');}catch(e:any){toast.error(e.message);}
  }
  return <div className="container mx-auto px-4 py-9 space-y-7"><div><p className="eyebrow">MARKETPLACE OPERATIONS</p><h1 className="text-3xl font-bold mt-3">Make the first purchase count.</h1><p className="text-muted-foreground mt-3">A curated catalog, reliable suppliers, clear delivery, and helpful order support.</p></div>
    <Tabs defaultValue="catalog"><TabsList className="flex-wrap h-auto gap-1 mb-5"><TabsTrigger value="catalog">Catalog</TabsTrigger><TabsTrigger value="suppliers">Suppliers & checks</TabsTrigger><TabsTrigger value="orders">Orders & support</TabsTrigger><TabsTrigger value="settings">Delivery & terms</TabsTrigger><TabsTrigger value="metrics">Pilot metrics</TabsTrigger></TabsList>
      <TabsContent value="catalog" className="space-y-5"><div className="flex flex-wrap justify-between gap-4"><Input className="max-w-md" aria-label="Search catalog" placeholder="Search your catalog…" value={search} onChange={e=>setSearch(e.target.value)}/><Button onClick={()=>setEditing(null)}><Plus className="w-4 mr-2"/>Add item</Button></div>
        {editing!==undefined&&<ListingEditor key={editing?.id||'new'} listing={editing} admin onClose={()=>setEditing(undefined)} onSaved={()=>setEditing(undefined)}/>}
        {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=><div className="bg-white border rounded-2xl p-4 flex flex-wrap gap-4 items-center" key={p.id}><img src={p.image} alt={p.name} className="w-20 h-20 object-contain bg-muted rounded-xl"/><div className="flex-1 min-w-40"><h2 className="font-bold">{p.name}</h2><p className="text-sm text-muted-foreground">{categoryLabel(p.category)} · {formatCurrency(p.price)} · {p.stock} available</p><p className="text-xs text-primary mt-1">{p.status||'active'} · {p.reserved||0} reserved · {p.verified?'Checked':'Needs a catalog check'}</p></div><div className="flex gap-2 flex-wrap"><Button size="sm" variant="outline" onClick={()=>setEditing(p)}><Pencil className="w-4 mr-1"/>Edit</Button><Button size="sm" variant="outline" onClick={()=>change(p)}><EyeOff className="w-4 mr-1"/>Hide</Button><Button size="sm" variant="outline" onClick={()=>change(p,true)}><Trash2 className="w-4 mr-1"/>Remove</Button></div></div>)}{!products.length&&<p className="text-muted-foreground py-8">Start with a few real, checked items. No example stock is added to your store.</p>}
      </TabsContent><TabsContent value="suppliers"><SupplierReview/></TabsContent><TabsContent value="orders"><OrderOperations/></TabsContent><TabsContent value="settings"><PilotSettings/></TabsContent><TabsContent value="metrics"><OrderOperations analytics/></TabsContent>
    </Tabs>
  </div>;
}
