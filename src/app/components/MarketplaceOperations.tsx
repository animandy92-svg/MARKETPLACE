import { useEffect, useState } from 'react';
import { collection, collectionGroup, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { RefreshCw, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { apiRequest } from '../lib/api';
import { useShop, ShopSettings } from '../lib/shop';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

export function PilotSettings() {
  const shop = useShop();
  const [form,setForm] = useState<ShopSettings>(shop), [busy,setBusy] = useState(false);
  useEffect(() => setForm(shop), [shop]);
  const field = (key: string,value:any) => setForm(prev => ({...prev,[key]:value}));
  async function save(e:React.FormEvent) {
    e.preventDefault();
    if (!form.serviceArea.trim() || (!form.supportPhone && !form.supportEmail) || form.deliveryZones.some(z => !z.name.trim() || !z.timing.trim() || !Number.isFinite(z.fee) || z.fee < 0 || z.fee > 10000)) { toast.error('Complete each area, fee, and delivery timing'); return; }
    setBusy(true);
    try { await setDoc(doc(db,'shop','settings'),form); toast.success('Delivery and support settings published'); }
    catch { toast.error('Could not save service settings'); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="policy-panel space-y-5"><div><h2 className="text-xl font-bold">Your pilot promise</h2><p className="text-sm text-muted-foreground mt-2">Only add delivery areas you can serve. These terms appear on the homepage, help page, and checkout.</p></div><div className="grid sm:grid-cols-2 gap-5">
    <label className="text-sm space-y-2">Service area<Input required maxLength={200} value={form.serviceArea} onChange={e => field('serviceArea',e.target.value)} /></label>
    <label className="text-sm space-y-2">Public support phone<Input type="tel" maxLength={40} value={form.supportPhone} onChange={e => field('supportPhone',e.target.value)} /></label>
    <label className="text-sm space-y-2">Public support email<Input type="email" maxLength={200} placeholder="support@yourdomain.com" value={form.supportEmail} onChange={e => field('supportEmail',e.target.value)} /></label>
    <label className="text-sm space-y-2">Support hours<Input maxLength={200} placeholder="Publish the hours you can cover" value={form.supportHours} onChange={e => field('supportHours',e.target.value)} /></label>
    <label className="text-sm space-y-2">Return window, days<Input type="number" required min="1" max="90" value={form.returnDays} onChange={e => field('returnDays',Number(e.target.value))} /></label>
    <label className="text-sm space-y-2">Tax rate, percent<Input type="number" required min="0" max="30" step="0.01" value={form.taxBasisPoints/100} onChange={e => field('taxBasisPoints',Math.round(Number(e.target.value)*100))} /><span className="block text-xs text-muted-foreground">Use the rate confirmed for your business. No automatic 10% surcharge.</span></label>
    <label className="text-sm space-y-2 sm:col-span-2">Return terms<Textarea required maxLength={3000} rows={4} value={form.returnTerms} onChange={e => field('returnTerms',e.target.value)} /></label>
  </div><div className="flex items-center justify-between"><h3 className="font-bold">Delivery areas</h3><Button type="button" variant="outline" size="sm" disabled={form.deliveryZones.length>=20} onClick={() => field('deliveryZones',[...form.deliveryZones,{id:crypto.randomUUID(),name:'',fee:0,timing:''}])}><Plus className="w-4 mr-1" />Add area</Button></div>
    {!form.deliveryZones.length && <p className="text-sm text-muted-foreground">Checkout stays closed until at least one delivery area and its fee and timing are published.</p>}
    {form.deliveryZones.map((zone,i) => <div key={zone.id} className="grid sm:grid-cols-[1fr_120px_1fr_auto] gap-3 p-4 bg-muted rounded-xl"><label className="text-xs space-y-2">Area name<Input required maxLength={120} value={zone.name} onChange={e => field('deliveryZones',form.deliveryZones.map((z,index) => index===i?{...z,name:e.target.value}:z))} /></label><label className="text-xs space-y-2">Fee (GHS)<Input required type="number" min="0" max="10000" step="0.01" value={zone.fee} onChange={e => field('deliveryZones',form.deliveryZones.map((z,index) => index===i?{...z,fee:Number(e.target.value)}:z))} /></label><label className="text-xs space-y-2">Delivery timing<Input required maxLength={160} placeholder="Your actual delivery commitment" value={zone.timing} onChange={e => field('deliveryZones',form.deliveryZones.map((z,index) => index===i?{...z,timing:e.target.value}:z))} /></label><Button className="self-end" type="button" variant="ghost" size="sm" onClick={() => field('deliveryZones',form.deliveryZones.filter((_,index) => index!==i))}>Remove</Button></div>)}
    <Button disabled={busy} type="submit">{busy?'Saving…':'Publish service settings'}</Button></form>;
}

export function SupplierReview() {
  const [requests,setRequests] = useState<any[]>([]), [drafts,setDrafts] = useState<any[]>([]), [checked,setChecked] = useState<Record<string,boolean>>({}), [busy,setBusy] = useState('');
  useEffect(() => {
    const stops = [onSnapshot(collectionGroup(db,'seller_requests'),snap => setRequests(snap.docs.map(d => ({id:d.id,path:d.ref.path,...d.data()}))),() => toast.error('Could not load supplier applications')),
      onSnapshot(collection(db,'listing_submissions'),snap => setDrafts(snap.docs.filter(d => d.data().status==='pending').map(d => ({id:d.id,...d.data()}))))];
    return () => stops.forEach(stop => stop());
  },[]);
  async function decision(request:any,status:string) {
    setBusy(request.id);
    try {
      const notes=window.prompt('Supplier reliability / review notes (optional)',request.notes||''); if(notes===null) return;
      const batch=writeBatch(db); batch.update(doc(db,request.path),{status,notes:notes.slice(0,2000),reviewed_at:serverTimestamp()});
      batch.set(doc(db,'seller_profiles',request.user_id),{status,name:request.fullName,phone:request.phone,email:request.email,notes:notes.slice(0,2000),reviewed_at:serverTimestamp()},{merge:true});
      await batch.commit(); toast.success('Supplier '+status);
    } catch { toast.error('Could not update the supplier'); } finally { setBusy(''); }
  }
  async function publish(draft:any) {
    if(!checked[draft.id]) return;
    setBusy(draft.id);
    try {
      await runTransaction(db,async tx => {
        const ref=doc(db,'products',draft.id), submissionRef=doc(db,'listing_submissions',draft.id);
        const [existing,seller,submission]=await Promise.all([tx.get(ref),tx.get(doc(db,'seller_profiles',draft.seller_id)),tx.get(submissionRef)]);
        if(seller.data()?.status!=='approved') throw new Error('This supplier is not approved');
        if((existing.data()?.reserved||0)>0) throw new Error('Stock is reserved. Finish pending orders before editing quantities.');
        if(submission.data()?.status!=='pending') throw new Error('This submission has already been reviewed');
        const live=submission.data()!;
        tx.set(ref,{...live,active:true,status:'active',verified:true,rating:existing.data()?.rating||0,review_count:existing.data()?.review_count||0,review_sum:existing.data()?.review_sum||0,created_at:existing.data()?.created_at||serverTimestamp(),updated_at:serverTimestamp()});
        tx.update(submissionRef,{status:'published'});
      }); toast.success('Listing published');
    } catch(e:any) {toast.error(e.message);} finally{setBusy('');}
  }
  return <div className="space-y-7"><section className="space-y-3"><h2 className="text-xl font-bold">Supplier shortlist</h2><p className="text-sm text-muted-foreground">Speak to suppliers and check reliability before approval. Approving a supplier enables their workspace; listings still need review.</p>
    {requests.map(r => <div className="policy-panel" key={r.path}><div className="flex flex-wrap justify-between gap-4"><div><h3 className="font-bold">{r.fullName}</h3><p className="text-sm mt-1">{r.email} · {r.phone}</p><p className="text-xs text-primary mt-2">{r.status}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy===r.id} onClick={() => decision(r,'approved')}>Approve</Button><Button size="sm" variant="outline" disabled={busy===r.id} onClick={() => decision(r,r.status==='approved'?'suspended':'rejected')}>{r.status==='approved'?'Suspend':'Reject'}</Button></div></div><p className="text-sm text-muted-foreground mt-4">{r.description}</p>{r.notes&&<p className="text-xs mt-3">Review notes: {r.notes}</p>}</div>)}{!requests.length&&<p className="text-sm text-muted-foreground">No supplier applications yet. Invite a few reliable suppliers to <Link className="underline" to="/sell">apply</Link>.</p>}</section>
    <section className="space-y-4"><h2 className="text-xl font-bold">Listings awaiting checks</h2>{drafts.map(d => <div key={d.id} className="policy-panel"><div className="flex flex-wrap gap-5"><img src={d.image} alt={d.name} className="w-36 h-36 object-contain bg-muted rounded-xl" /><div className="flex-1"><h3 className="font-bold">{d.name}</h3><p className="text-sm mt-2">{formatCurrency(d.price)} · {d.stock} available · {d.condition}</p><p className="text-sm text-muted-foreground mt-2">{d.description}</p>{d.specs?.map((s:string,i:number)=><p key={i} className="text-xs mt-1">{s}</p>)}</div></div><label className="flex gap-2 items-start text-sm mt-5"><input type="checkbox" className="mt-1" checked={!!checked[d.id]} onChange={e=>setChecked({...checked,[d.id]:e.target.checked})} />I verified stock, actual photos, condition, price, and supplier reliability.</label><Button size="sm" className="mt-4" disabled={!checked[d.id]||busy===d.id} onClick={()=>publish(d)}>Publish checked item</Button></div>)}{!drafts.length&&<p className="text-sm text-muted-foreground">No listings waiting for review.</p>}</section></div>;
}

function AdminOrder({order,onRefresh}:{order:any;onRefresh:()=>void}) {
  const [status,setStatus]=useState(order.status),[note,setNote]=useState(order.delivery_note||''),[busy,setBusy]=useState(false),[costs,setCosts]=useState<Record<string,string>>({});
  const next:Record<string,string>= {paid:'processing',processing:'out_for_delivery',out_for_delivery:'delivered',shipped:'delivered'};
  async function action(name:string,extra:any={}) {setBusy(true);try{await apiRequest('/ops/'+name,{uid:order.user_id,orderId:order.id,...extra});toast.success('Order updated');onRefresh();}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}
  return <div className="policy-panel space-y-4"><div className="flex flex-wrap gap-3 justify-between"><div><h3 className="font-bold">#{order.id.slice(0,8)} · {order.status.replaceAll('_',' ')}</h3><p className="text-sm text-muted-foreground mt-1">{order.payment_status||'Unpaid'} · {formatCurrency(order.total)} · {order.payment_channel||''}</p></div><p className="text-xs">{order.refund_status&&`Refund: ${order.refund_status}`}</p></div>
    <div className="text-sm">{order.items?.map((line:any)=><p key={line.product_id}>{line.name} × {line.quantity}</p>)}<p className="mt-3">{order.shipping_address} · {order.phone}</p><p className="text-muted-foreground">{order.delivery_zone} · {order.delivery_timing}</p></div>
    {order.help_request&&<div className="bg-amber-50 rounded-xl p-4 text-sm"><p className="font-bold">Customer help request · {order.help_status}</p><p className="mt-2">{order.help_request}</p><Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={()=>action('update',{help_status:'resolved',note})}>Mark help resolved</Button></div>}
    {!!Object.keys(order.seller_ready||{}).length&&<p className="text-xs text-primary">{Object.values(order.seller_ready).filter(Boolean).length} supplier(s) marked ready</p>}
    <label className="text-sm block space-y-2">Customer delivery / support update<Textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="Share the delivery arrangement or the resolution with the customer" /></label>
    <div className="flex flex-wrap gap-3"><select aria-label="Order status" className="border rounded-md px-3 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value={order.status}>{order.status.replaceAll('_',' ')}</option>{next[order.status]&&<option value={next[order.status]}>{next[order.status].replaceAll('_',' ')}</option>}</select><Button size="sm" disabled={busy} onClick={()=>action('update',{status,note})}>Save update</Button>
      {order.payment_status==='awaiting_payment'&&order.inventory_state==='reserved'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action('cancel')}>Cancel unpaid order</Button>}
      {order.payment_status==='paid'&&!order.refund_status&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{const reason=window.prompt('Reason for a full refund. This sends a refund request to Paystack.');if(reason&&window.confirm(`Refund ${formatCurrency(order.total)} to the original payment method?`))action('refund',{reason});}}>Request full refund</Button>}
      {order.refund_status&&order.refund_status!=='processed'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{const refundId=order.refund_id||window.prompt('Refund ID from Paystack dashboard');if(refundId)action('refund-sync',{refundId});}}>Reconcile refund</Button>}
      {order.refund_status&&order.inventory_state==='committed'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(window.confirm('Have ALL returned items been physically received and checked for resale?'))action('restock',{confirmReturned:true});}}>Confirm returned stock</Button>}
    </div><details><summary className="cursor-pointer text-sm text-primary">Order costs & contribution</summary><div className="grid sm:grid-cols-3 gap-4 mt-4">{[['goods_cost','Supplier goods cost'],['payment_fee','Payment fees'],['delivery_cost','Delivery cost'],['support_cost','Support cost'],['refund_cost','Refund handling cost'],['goods_recovered','Value of recovered goods']].map(([key,label])=><label key={key} className="text-xs space-y-2">{label} (GHS)<Input type="number" min="0" step="0.01" placeholder={String(order[key]??'Not recorded')} value={costs[key]??''} onChange={e=>setCosts({...costs,[key]:e.target.value})}/></label>)}</div><Button size="sm" className="mt-4" disabled={busy} onClick={()=>action('update',Object.fromEntries(Object.entries(costs).filter(([,v])=>v!=='').map(([k,v])=>[k,Number(v)])))}>Save actual costs</Button></details>
  </div>;
}

export function OrderOperations({analytics=false}:{analytics?:boolean}) {
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[spend,setSpend]=useState('');
  async function refresh(){setBusy(true);try{const result=await apiRequest('/ops/summary');setData(result);setSpend(String(result.metrics.marketingSpend));setError('');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  useEffect(()=>{refresh();},[]);
  if(error)return <div className="policy-panel space-y-4"><h2 className="text-xl font-bold">Order service needs deployment</h2><p className="text-sm text-muted-foreground">The Firebase API requires Blaze billing. Payments also need a private Paystack key and a configured webhook. Catalog curation, supplier approval, and service settings are available in the other tabs.</p><p className="text-xs text-muted-foreground">{error}</p><Button onClick={refresh} disabled={busy}>Check again</Button></div>;
  if(!data)return <p className="text-muted-foreground">Loading operations…</p>;
  const m=data.metrics;
  return <div className="space-y-6"><div className="flex justify-between gap-4"><h2 className="text-xl font-bold">{analytics?'Pilot performance':'Orders & support'}</h2><Button size="sm" variant="outline" disabled={busy} onClick={refresh}><RefreshCw className="w-4 mr-2"/>Refresh</Button></div>{data.truncated&&<p className="text-sm text-amber-700">This pilot report covers 500 orders. Export the full dataset before making decisions at a larger scale.</p>}
    {analytics?<><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[['Completed deliveries',m.delivered],['Cancellations / expiry',m.cancellations],['Repeat customers',`${m.repeatCustomers} (${Math.round(m.repeatRate*100)}%)`],['Refunds',m.refunds],['Customers with delivery',m.customers],['Acquisition cost / customer',m.cac===null?'No deliveries yet':formatCurrency(m.cac)],['Contribution / costed order',m.contributionPerOrder===null?'Costs needed':formatCurrency(m.contributionPerOrder)],['Total known contribution',formatCurrency(m.contribution)]].map(([label,value])=><div className="policy-panel" key={label as string}><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-3">{value}</p></div>)}</div><p className="text-sm text-muted-foreground">Contribution includes product revenue and delivery charges, less tax, supplier goods, payment fees, actual delivery cost, support, refunds, and refund handling; recovered goods are credited. {m.costedOrders} orders have complete costs. {m.missingCosts} paid completed/cancelled/refunded orders still need costs. Repeat rate counts customers with at least two completed deliveries.</p><div className="policy-panel space-y-4"><label className="text-sm space-y-2 block">Total acquisition spend for this pilot (GHS)<Input type="number" min="0" step="0.01" value={spend} onChange={e=>setSpend(e.target.value)} /></label><Button onClick={async()=>{try{await apiRequest('/ops/marketing',{marketingSpend:Number(spend)});refresh();}catch(e:any){toast.error(e.message);}}}>Save acquisition spend</Button><p className="text-xs text-muted-foreground">Use the spend for the same period as these orders. CAC = spend ÷ customers with a completed delivery.</p></div></>:<>{data.orders.map((order:any)=><AdminOrder key={order.id+'-'+(order.updated_at?._seconds||order.status)} order={order} onRefresh={refresh}/>)}{!data.orders.length&&<p className="text-sm text-muted-foreground">No orders yet. Complete the payment and delivery setup before opening checkout.</p>}</>}
  </div>;
}
