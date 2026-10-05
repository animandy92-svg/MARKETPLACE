import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';

const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore,Timestamp}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth');
const projectId='demo-marketplace',api=`http://127.0.0.1:5001/${projectId}/us-central1/api/api`;
async function account(email){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'EmulatorOnly123!',returnSecureToken:true})});assert.equal(response.status,200);return response.json();}
async function token(email){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'EmulatorOnly123!',returnSecureToken:true})});return (await response.json()).idToken;}
async function request(path,idToken,body){const response=await fetch(api+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(idToken?{Authorization:`Bearer ${idToken}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});return {status:response.status,data:await response.json()};}
async function webhook(event,data,signature=true){const body=JSON.stringify({event,data});const response=await fetch(api+'/payments/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-paystack-signature':signature?createHmac('sha512','sk_test_emulator').update(body).digest('hex'):'bad'},body});return {status:response.status,data:await response.json()};}

test('one purchase, mobile money, concurrent stock, fulfillment, support, verified review and full refund',async()=>{
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST,'Use npm run test:api, never production');
  const app=initializeApp({projectId}),db=getFirestore(app),payments=new Map(),refunds=new Map();let initialized=0,refunded=0;
  const provider=createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
    let data;
    if(req.url==='/transaction/initialize'){
      assert.deepEqual(body.channels,['card','mobile_money']);assert.equal(body.currency,'GHS');assert.ok(body.amount>0);assert.match(body.reference,/^[A-Za-z0-9.=-]+$/);assert.equal(typeof body.metadata,'string');initialized++;
      data={authorization_url:'https://checkout.paystack.com/emulator',reference:body.reference};
      payments.set(body.reference,{id:100+initialized,status:'pending',amount:Number(body.amount),currency:body.currency,reference:body.reference,metadata:JSON.parse(body.metadata),fees:200,channel:'mobile_money'});
    }else if(req.url.startsWith('/transaction/verify/'))data=payments.get(req.url.split('/').at(-1));
    else if(req.url==='/refund'){
      refunded++;data={id:refunded,amount:body.amount,currency:body.currency,transaction:payments.get(body.transaction).id,status:'pending'};refunds.set(String(data.id),data);
    }else if(req.url.startsWith('/refund/'))data=refunds.get(req.url.split('/').at(-1));
    res.writeHead(data?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify({status:!!data,data}));
  });
  await new Promise(resolve=>provider.listen(9876,'127.0.0.1',resolve));
  try{
    await db.doc('shop/settings').set({serviceArea:'Ghana',supportPhone:'0594081604',taxBasisPoints:0,deliveryZones:[{id:'test-area',name:'Emulator test area',fee:10,timing:'Test delivery timing'}]});
    const listing={name:'Calculator',category:'school',description:'Test listing',price:30,stock:3,rating:0,specs:[],image:'',active:true,status:'active',verified:true};
    await db.doc('products/calculator').set(listing);await db.doc('product_costs/calculator').set({cost:15});
    const buyer=await account('buyer@example.test'),other=await account('other@example.test'),manager=await account('manager@example.test');
    await getAuth(app).setCustomUserClaims(manager.localId,{admin:true});const adminToken=await token('manager@example.test');
    const body={shippingAddress:'Emulator test address',phone:'0201234567',deliveryZone:'test-area',checkoutId:'first-order-1',status:'paid',total:0,items:[{productId:'calculator',quantity:2,price:.01}]};
    assert.equal((await request('/orders',null,body)).status,401);
    const profile=await request('/auth/firebase',buyer.idToken,{firebaseUid:other.localId,email:'forged@example.test',role:'admin',name:'Buyer'});
    assert.equal(profile.data.user.id,buyer.localId);assert.equal(profile.data.user.role,'buyer');
    const order=await request('/orders',buyer.idToken,body);assert.equal(order.status,201);assert.equal(order.data.status,'pending');assert.equal(order.data.total,70);
    const ref=db.doc(`users/${buyer.localId}/orders/${order.data.id}`);
    assert.equal((await ref.get()).data().items[0].price,30);assert.equal((await db.doc('products/calculator').get()).data().stock,1);
    assert.equal((await request('/orders',buyer.idToken,body)).data.id,order.data.id);assert.equal((await db.doc('products/calculator').get()).data().stock,1);
    assert.equal((await request('/orders',other.idToken,{...body,checkoutId:'other-order-1'})).status,400);
    assert.equal((await request('/orders',other.idToken)).data.length,0);
    assert.equal((await request('/ops/summary',buyer.idToken)).status,403);
    await request(`/orders/${order.data.id}/action`,buyer.idToken,{action:'cancel'});await request(`/orders/${order.data.id}/action`,buyer.idToken,{action:'cancel'});
    assert.equal((await db.doc('products/calculator').get()).data().stock,3);
    assert.equal((await request('/payments/initialize',buyer.idToken,{...body,deliveryZone:'outside',checkoutId:'bad-area-1'})).status,400);
    const concurrent=await Promise.all([request('/payments/initialize',buyer.idToken,{...body,checkoutId:'purchase-order-1'}),request('/payments/initialize',other.idToken,{...body,checkoutId:'purchase-order-2'})]);
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400]);const paymentResult=concurrent.find(r=>r.status===200).data;
    const winner=concurrent[0].status===200?buyer:other,loser=winner===buyer?other:buyer;
    const purchaseRef=db.doc(`users/${winner.localId}/orders/${paymentResult.orderId}`),purchase=(await purchaseRef.get()).data(),reference=paymentResult.reference;
    const winningBody={...body,checkoutId:winner===buyer?'purchase-order-1':'purchase-order-2'};
    await request('/payments/initialize',winner.idToken,winningBody);assert.equal(initialized,1);
    const checkedListing={...listing,id:'calculator',image:'https://example.test/calculator.jpg',condition:'new',checked:true};
    assert.equal((await request('/seller/save',adminToken,checkedListing)).status,409,'Catalog edits cannot replace reserved stock');
    assert.equal((await request('/payments/verify/'+reference,loser.idToken)).status,404);
    assert.equal((await request('/payments/verify/'+reference,winner.idToken)).status,409);
    const payment=payments.get(reference);payment.status='success';
    assert.equal((await webhook('charge.success',payment,false)).status,401);
    assert.equal((await webhook('charge.success',{...payment,amount:1})).status,409);
    assert.equal((await webhook('charge.success',payment)).status,200);
    assert.equal((await webhook('charge.success',payment)).status,200);
    assert.equal((await request('/payments/verify/'+reference,winner.idToken)).status,200);
    assert.equal((await purchaseRef.get()).data().status,'paid');assert.equal((await db.doc('products/calculator').get()).data().stock,1);assert.equal((await db.doc('products/calculator').get()).data().reserved,0);
    assert.equal((await purchaseRef.get()).data().goods_cost,undefined,'Private cost does not leak to the buyer');
    const op={uid:winner.localId,orderId:paymentResult.orderId};
    assert.equal((await request('/ops/update',adminToken,{...op,status:'delivered'})).status,409);
    assert.equal((await request('/reviews/calculator',winner.idToken,{orderId:paymentResult.orderId,rating:5,comment:'Delivered as described'})).status,403);
    for(const status of ['processing','out_for_delivery','delivered'])assert.equal((await request('/ops/update',adminToken,{...op,status,note:'Test delivery update'})).status,200);
    assert.equal((await request('/reviews/calculator',loser.idToken,{orderId:paymentResult.orderId,rating:5,comment:'Fake purchase'})).status,403);
    assert.equal((await request('/reviews/calculator',winner.idToken,{orderId:paymentResult.orderId,rating:5,comment:'Delivered as described'})).status,200);
    assert.equal((await request('/reviews/calculator',winner.idToken,{orderId:paymentResult.orderId,rating:1,comment:'Duplicate'})).status,409);
    assert.equal((await db.doc('products/calculator').get()).data().review_count,1);
    assert.equal((await request(`/orders/${paymentResult.orderId}/action`,winner.idToken,{action:'help',message:'Please help with a return'})).status,200);
    assert.equal((await request('/ops/update',adminToken,{...op,delivery_cost:12,support_cost:3,refund_cost:0,goods_recovered:0,help_status:'resolved'})).status,200);
    assert.equal((await request('/ops/refund',adminToken,{...op,reason:'Customer requested return'})).status,200);
    assert.equal((await request('/ops/refund',adminToken,{...op,reason:'Duplicate request'})).status,409);assert.equal(refunded,1);
    const refund=refunds.get('1');refund.status='processed';
    assert.equal((await webhook('refund.processed',{...refund,amount:1})).status,409);
    assert.equal((await request('/ops/refund-sync',adminToken,op)).status,200);
    assert.equal((await webhook('refund.processed',refund)).status,200);
    assert.equal((await request('/ops/refund-sync',adminToken,op)).status,200,'Refund reconciliation can safely be repeated');
    assert.equal((await purchaseRef.get()).data().status,'refunded');
    assert.equal((await request('/ops/restock',adminToken,{...op,confirmReturned:true})).status,200);
    assert.equal((await request('/ops/restock',adminToken,{...op,confirmReturned:true})).status,400);assert.equal((await db.doc('products/calculator').get()).data().stock,3);
    await db.doc(`seller_profiles/${manager.localId}`).set({status:'approved'});
    await db.doc('listing_submissions/calculator').set({...checkedListing,seller_id:manager.localId,status:'pending'});
    assert.equal((await request('/seller/publish',adminToken,{id:'calculator',checked:true})).status,200);
    const republished=(await db.doc('products/calculator').get()).data();
    assert.equal(republished.review_sum,5,'Republishing preserves purchase-backed review aggregates');assert.equal(republished.review_count,1);
    const report=(await request('/ops/summary',adminToken)).data;assert.equal(report.metrics.refunds,1);assert.equal(report.metrics.costedOrders,1);assert.equal(report.metrics.contribution,-17);
    // A late charge after cancellation must never allocate already released stock.
    const late=await request('/payments/initialize',buyer.idToken,{...body,items:[{productId:'calculator',quantity:1}],checkoutId:'late-payment-1'});
    await request(`/orders/${late.data.orderId}/action`,buyer.idToken,{action:'cancel'});const latePayment=payments.get(late.data.reference);latePayment.status='success';
    assert.equal((await webhook('charge.success',latePayment)).status,200);assert.equal((await db.doc(`users/${buyer.localId}/orders/${late.data.orderId}`).get()).data().status,'payment_review');assert.equal((await db.doc('products/calculator').get()).data().stock,3);
    // An unpaid reservation expires without trusting a browser callback.
    const exp=await request('/orders',buyer.idToken,{...body,checkoutId:'expire-order-1'});await db.doc(`reservation_queue/${exp.data.id}`).update({expires_at:Timestamp.fromMillis(0)});
    await require('../functions/lib/payments').expireReservations();
    assert.equal((await db.doc(`users/${buyer.localId}/orders/${exp.data.id}`).get()).data().status,'expired');
    assert.equal((await db.doc('products/calculator').get()).data().stock,3);
    assert.ok(purchase.return_terms); // Order retains the policy it was placed under.
  }finally{await new Promise(resolve=>provider.close(resolve));await deleteApp(app);}
});
