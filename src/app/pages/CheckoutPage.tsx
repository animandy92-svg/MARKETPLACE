import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, LockKeyhole, Truck, Loader2, ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../lib/shop';
import { apiRequest } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

export function CheckoutPage() {
  const { items,total }=useCart(), {user}=useAuth(), shop=useShop(), navigate=useNavigate();
  const [address,setAddress]=useState(''),[phone,setPhone]=useState(user?.phone||''),[zone,setZone]=useState('');
  const [health,setHealth]=useState<any>(null),[error,setError]=useState(''),[quote,setQuote]=useState<any>(null),[quoting,setQuoting]=useState(false),[busy,setBusy]=useState(false);
  const verified=useRef('');
  useEffect(()=>{apiRequest('/health').then(setHealth).catch(e=>setError(e.message));},[]);
  useEffect(()=>{
    const reference=new URLSearchParams(window.location.search).get('reference');
    if(!user||!reference||verified.current===reference)return;verified.current=reference;setBusy(true);
    apiRequest('/payments/verify/'+encodeURIComponent(reference)).then(result=>{toast.success(result.status==='payment_review'?'Payment received. Support will help with this order.':'Payment confirmed');sessionStorage.removeItem('jat-checkout-'+user.id);navigate('/dashboard/orders',{replace:true});}).catch(e=>{verified.current='';toast.error(e.message);}).finally(()=>setBusy(false));
  },[user?.id]);
  const body={items:items.map(i=>({productId:i.id,quantity:i.quantity})),shippingAddress:address,phone,deliveryZone:zone};
  const fingerprint=JSON.stringify(body);
  useEffect(()=>{
    setQuote(null);
    if(!items.length||address.trim().length<5||phone.length<7||!zone||!health)return;
    let current=true;
    const timer=setTimeout(()=>{setQuoting(true);apiRequest('/orders/quote',body).then(q=>{if(current){setQuote(q);setError('');}}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setQuoting(false);});},350);
    return()=>{current=false;clearTimeout(timer);setQuoting(false);};
  },[fingerprint,health]);
  async function pay(){
    if(!user||!quote)return;setBusy(true);
    try{
      const storageKey='jat-checkout-'+user.id;
      let stored:any=null;try{stored=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
      if(stored?.fingerprint!==fingerprint)stored={fingerprint,id:crypto.randomUUID()};sessionStorage.setItem(storageKey,JSON.stringify(stored));
      const source=new URLSearchParams(window.location.search).get('utm_source')||sessionStorage.getItem('jat-source')||'direct';
      const result=await apiRequest('/payments/initialize',{...body,checkoutId:stored.id,acquisitionSource:source});
      if(result.paid){navigate('/dashboard/orders');return;}
      window.location.assign(result.authorization_url);
    }catch(e:any){toast.error(e.message);}finally{setBusy(false);}
  }
  const chosen=shop.deliveryZones.find(z=>z.id===zone);
  const subtotalMinor=Math.round(total*100),tax=Math.round(subtotalMinor*shop.taxBasisPoints/10000)/100;
  if(!items.length&&!busy)return <div className="container mx-auto px-4 py-16 text-center space-y-5"><h1 className="text-3xl font-bold">Your next find is waiting.</h1><p className="text-muted-foreground">Add an item before checkout.</p><Link to="/products"><Button>Explore the catalog</Button></Link><Link className="block text-primary underline" to="/dashboard/orders">View your orders</Link></div>;
  const enabled=health?.paymentsEnabled&&shop.deliveryZones.length>0;
  return <div className="container mx-auto px-4 py-9 space-y-7"><Link className="inline-flex gap-2 items-center text-sm text-muted-foreground" to="/cart"><ArrowLeft className="w-4"/>Back to your bag</Link><div><p className="eyebrow">ONE STEP CLOSER TO YOUR FIND</p><h1 className="text-4xl font-bold mt-3">Let’s get it to you.</h1></div>
    {(!enabled||error)&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm"><p className="font-bold">{enabled?'Please check your order details':'Online checkout is being prepared'}</p><p className="mt-2">{error||(!shop.deliveryZones.length?'Delivery areas, charges, and timing need to be confirmed.':'Payments are not configured yet.')}</p><Link to="/help" className="text-primary underline inline-block mt-3">Contact support · {shop.supportPhone}</Link></div>}
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-7"><div className="space-y-5"><div className="policy-panel space-y-5"><h2 className="text-xl font-bold flex items-center gap-2"><Truck className="text-primary w-5"/>Delivery details</h2><label className="block text-sm space-y-2">Delivery area<select className="w-full border rounded-md p-3" value={zone} onChange={e=>setZone(e.target.value)}><option value="">Choose your delivery area</option>{shop.deliveryZones.map(z=><option key={z.id} value={z.id}>{z.name} · {formatCurrency(z.fee)}</option>)}</select></label>{chosen&&<p className="text-sm text-primary">{chosen.timing}</p>}<label className="block text-sm space-y-2">Full address and landmark<Input value={address} maxLength={1000} placeholder="Town, street / campus, building and landmark" onChange={e=>setAddress(e.target.value)}/></label><label className="block text-sm space-y-2">Delivery contact phone<Input type="tel" maxLength={30} value={phone} placeholder="Your phone number" onChange={e=>setPhone(e.target.value)}/></label><p className="text-xs text-muted-foreground">Only order to one of our listed areas. <Link className="underline" to="/delivery">Read delivery terms</Link>.</p></div>
      <div className="policy-panel space-y-4"><h2 className="text-xl font-bold">Your finds</h2>{items.map(item=><div className="flex justify-between gap-4 text-sm border-b border-border pb-3" key={item.id}><span>{item.name}<span className="text-muted-foreground"> × {item.quantity}</span></span><span>{formatCurrency(item.price*item.quantity)}</span></div>)}</div></div>
      <div className="policy-panel h-fit lg:sticky lg:top-24 space-y-5"><h2 className="text-xl font-bold">The full picture</h2>{[['Items',quote?.subtotal??total],['Tax',quote?.tax??tax],['Delivery',quote?.delivery??chosen?.fee]].map(([label,value])=><div className="flex justify-between text-sm" key={label as string}><span className="text-muted-foreground">{label}</span><span>{value===undefined?'Choose an area':formatCurrency(value as number)}</span></div>)}<div className="flex justify-between text-xl font-bold border-t pt-4"><span>{quote?'Total':'Estimated total'}</span><span>{formatCurrency(quote?.total??total+tax+(chosen?.fee||0))}</span></div><p className="text-xs text-muted-foreground">{quoting?'Checking live stock and prices…':'The server confirms stock, prices, and delivery before you pay.'}</p>
        <Button className="w-full" size="lg" disabled={!enabled||!quote||busy||quoting} onClick={pay}>{busy?<Loader2 className="w-4 animate-spin mr-2"/>:<Smartphone className="w-4 mr-2"/>}Pay with mobile money or card</Button>{health?.paymentMode==='test'&&health?.paymentsEnabled&&<p className="text-xs text-amber-700 font-semibold">Test payment mode · use provider test details only</p>}
        <p className="text-xs text-muted-foreground leading-relaxed flex gap-2"><LockKeyhole className="w-4 shrink-0"/>Paystack handles your payment securely. Approve mobile money on your phone. Stock is held for 30 minutes while you pay; a pending provider authorization may take longer.</p><p className="text-xs text-muted-foreground">By placing an order, you accept the <Link to="/returns" className="underline">return terms</Link>. You can follow progress and ask for help in your account.</p>
      </div></div>
  </div>;
}
