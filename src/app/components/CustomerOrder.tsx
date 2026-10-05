import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, MessageCircle, Star } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'sonner';

export function CustomerOrder({order}:{order:any}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[help,setHelp]=useState(false),[review,setReview]=useState(''),[rating,setRating]=useState(5),[comment,setComment]=useState('');
  async function action(path:string,body?:any) {setBusy(true);try{await apiRequest(path,body);toast.success('Saved. Your order will update here.');setHelp(false);setReview('');}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}
  const status=String(order.status).replaceAll('_',' ');
  return <div className="policy-panel space-y-4"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="font-bold">Order #{order.id.slice(0,8)}</h2><p className="text-xs text-muted-foreground mt-1">{order.created_at?.toDate?.().toLocaleDateString()}</p></div><div className="text-right"><p className="font-bold text-primary">{formatCurrency(order.total)}</p><p className="text-xs mt-1 px-3 py-1 bg-primary/10 text-primary rounded-full">{status}</p></div></div>
    {order.items?.map((line:any)=><p key={line.product_id} className="text-sm">{line.name} × {line.quantity}</p>)}
    <p className="text-sm text-muted-foreground">{order.shipping_address}<br/>{order.delivery_zone} {order.delivery_timing&&'· '+order.delivery_timing}</p>
    {order.delivery_note&&<p className="text-sm bg-primary/5 rounded-xl p-4">Update from the team: {order.delivery_note}</p>}
    {order.refund_status&&<p className="text-sm text-primary">Refund: {order.refund_status}. {order.refund_status==='processed'?'The payment provider has confirmed your refund.':'Support is following this with the payment provider.'}</p>}
    {order.status==='payment_review'&&<p className="text-sm text-amber-700">Payment arrived after the stock hold expired. Contact support to arrange your refund.</p>}
    <ol className="text-xs space-y-2 border-l-2 border-primary/20 pl-4">{order.history?.map((entry:any,i:number)=><li key={i}><span className="font-semibold capitalize">{entry.status.replaceAll('_',' ')}</span> · {new Date(entry.at).toLocaleString()}<p className="text-muted-foreground mt-1">{entry.note}</p></li>)}</ol>
    <div className="flex flex-wrap gap-2">
      {order.status==='pending'&&order.paystack_ref&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action('/payments/verify/'+encodeURIComponent(order.paystack_ref))}><Smartphone className="w-4 mr-1"/>Check payment</Button>}
      {order.status==='pending'&&order.authorization_url&&<a className="text-sm text-primary underline p-2" href={order.authorization_url}>Continue payment</a>}
      {order.status==='pending'&&order.inventory_state==='reserved'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action('/orders/'+order.id+'/action',{action:'cancel'})}>Cancel unpaid order</Button>}
      <Button size="sm" variant="outline" onClick={()=>setHelp(!help)}><MessageCircle className="w-4 mr-1"/>Ask for help / return</Button><Link to="/help" className="text-sm underline text-primary p-2">Contact support</Link>
      {order.status==='delivered'&&order.items?.map((line:any)=><Button key={line.product_id} variant="outline" size="sm" onClick={()=>{setReview(line.product_id);setComment('');}}><Star className="w-4 mr-1"/>Review {line.name}</Button>)}
    </div>
    {order.help_request&&<p className="text-xs text-muted-foreground">Your help request is {order.help_status||'open'}.</p>}
    {help&&<form onSubmit={e=>{e.preventDefault();action('/orders/'+order.id+'/action',{action:'help',message});}} className="space-y-3"><label className="text-sm block">Tell us what happened<Textarea required minLength={5} maxLength={2000} rows={3} value={message} onChange={e=>setMessage(e.target.value)}/></label><Button size="sm" disabled={busy||message.trim().length<5}>Send help request</Button></form>}
    {review&&<form onSubmit={e=>{e.preventDefault();action('/reviews/'+review,{orderId:order.id,rating,comment});}} className="p-4 bg-muted rounded-xl space-y-3"><p className="text-sm font-semibold">Review your delivered purchase</p><label className="text-sm flex gap-3 items-center">Rating<select className="border rounded p-2 bg-white" value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} stars</option>)}</select></label><Textarea required minLength={3} maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="How was the item?"/><Button size="sm" disabled={busy}>Publish purchase-backed review</Button></form>}
  </div>;
}
