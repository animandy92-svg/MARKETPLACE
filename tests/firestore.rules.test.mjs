import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collectionGroup, query, collection, where } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-marketplace',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'products/p'), { name: 'Phone', price: 100, stock: 5 });
    await setDoc(doc(db, 'users/alice'), { firebase_uid:'alice',email:'alice@example.test',role:'buyer',name:'Alice' });
    await setDoc(doc(db, 'users/alice/orders/o'), { status:'pending',total:110 });
    await setDoc(doc(db, 'users/alice/orders/o/items/i'), { name:'Phone' });
  });
});
after(async () => { await env?.cleanup(); });

test('catalog is public to read and impossible to modify from clients', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('alice')]) {
    const ref = doc(context.firestore(), 'products/p');
    await assertSucceeds(getDoc(ref));
    await assertFails(updateDoc(ref, { price:0 }));
    await assertFails(deleteDoc(ref));
  }
});
test('users cannot read other accounts, forge roles, or mark orders paid', async () => {
  const db = env.authenticatedContext('alice',{email:'alice@example.test'}).firestore();
  await assertFails(getDoc(doc(db,'users/bob')));
  await assertFails(updateDoc(doc(db,'users/alice'),{role:'admin'}));
  await assertSucceeds(updateDoc(doc(db,'users/alice'),{name:'Alice Smith',phone:'123'}));
  await assertSucceeds(getDoc(doc(db,'users/alice/orders/o/items/i')));
  await assertFails(setDoc(doc(db,'users/alice/orders/forged'),{status:'paid',total:0}));
  await assertFails(updateDoc(doc(db,'users/alice/orders/o'),{status:'paid'}));
});
test('profiles must belong to the authenticated email and start as buyers', async () => {
  const db = env.authenticatedContext('bob',{email:'bob@example.test'}).firestore();
  const ref = doc(db,'users/bob');
  await assertFails(setDoc(ref,{firebase_uid:'bob',email:'alice@example.test',role:'buyer'}));
  await assertFails(setDoc(ref,{firebase_uid:'bob',email:'bob@example.test',role:'admin'}));
  await assertSucceeds(setDoc(ref,{firebase_uid:'bob',email:'bob@example.test',role:'buyer',name:'Bob'}));
});
test('cart quantities are positive integers and carts stay private', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const ref = doc(db,'users/alice/cart/p');
  for (const quantity of [-1,0,1.5,'1',100]) await assertFails(setDoc(ref,{quantity}));
  await assertSucceeds(setDoc(ref,{quantity:2}));
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/cart/p')));
  await assertSucceeds(deleteDoc(ref));
});

test('seller applications stay pending and private', async () => {
  const db = env.authenticatedContext('alice',{email:'alice@example.test'}).firestore();
  const ref = doc(db,'users/alice/seller_requests/application');
  const application = {user_id:'alice',email:'alice@example.test',status:'pending',fullName:'Alice',phone:'123',description:'Dresses',category:'fashion'};
  await assertFails(setDoc(ref,{...application,status:'approved'}));
  await assertSucceeds(setDoc(ref,application));
  await assertFails(updateDoc(ref,{status:'approved'}));
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/seller_requests/application')));
});

test('approved admin can publish, mark sold, and remove listings; profile roles do not grant access', async () => {
  const adminDb = env.authenticatedContext('manager',{admin:true}).firestore();
  const ref = doc(adminDb,'products/dress');
  const product = {name:'Dress',category:'fashion',price:80,stock:3,rating:0,description:'Cotton dress',specs:['Size M'],image:'',active:true,status:'active'};
  await assertSucceeds(setDoc(ref,product));
  await assertSucceeds(updateDoc(ref,{stock:0,active:false,status:'sold'}));
  await assertFails(updateDoc(ref,{price:-1}));
  await assertFails(updateDoc(ref,{stock:1.5}));
  await assertSucceeds(deleteDoc(ref));
  await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(),'products/forged'),product));
});

test('admin reviews suppliers; approved sellers can submit only private owned drafts', async () => {
  const adminDb=env.authenticatedContext('manager',{admin:true}).firestore();
  const sellerDb=env.authenticatedContext('seller',{email:'seller@example.test'}).firestore();
  const draft={name:'Laptop',category:'laptop',price:4000,stock:1,rating:0,review_count:0,review_sum:0,description:'Actual laptop',specs:[],image:'data:image/jpeg;base64,AAAA',condition:'used',seller_id:'seller',active:false,status:'pending',verified:false};
  await assertFails(setDoc(doc(sellerDb,'listing_submissions/laptop'),draft));
  await assertFails(setDoc(doc(sellerDb,'seller_profiles/seller'),{status:'approved'}));
  await assertSucceeds(setDoc(doc(adminDb,'seller_profiles/seller'),{status:'approved',name:'Supplier'}));
  await assertSucceeds(setDoc(doc(sellerDb,'listing_submissions/laptop'),draft));
  await assertSucceeds(getDocs(query(collection(sellerDb,'listing_submissions'),where('seller_id','==','seller'))));
  await assertFails(getDoc(doc(env.authenticatedContext('alice').firestore(),'listing_submissions/laptop')));
  await assertFails(updateDoc(doc(sellerDb,'listing_submissions/laptop'),{active:true,status:'active',verified:true}));
  await assertFails(setDoc(doc(sellerDb,'products/laptop'),{...draft,active:true,status:'active'}));
  await assertFails(updateDoc(doc(sellerDb,'listing_submissions/laptop'),{seller_id:'alice'}));
  await assertSucceeds(getDocs(collectionGroup(adminDb,'seller_requests')));
  await assertSucceeds(updateDoc(doc(adminDb,'users/alice/seller_requests/application'),{status:'approved',notes:'Checked supplier'}));
  await assertSucceeds(updateDoc(doc(adminDb,'seller_profiles/seller'),{status:'suspended'}));
  await assertFails(updateDoc(doc(sellerDb,'listing_submissions/laptop'),{stock:2}));
});
test('delivery terms are public but only admin can configure; costs and reservations stay private', async()=>{
  const adminDb=env.authenticatedContext('manager',{admin:true}).firestore(),buyerDb=env.authenticatedContext('alice').firestore();
  const config={serviceArea:'Ghana',deliveryZones:[],supportPhone:'0594081604',supportEmail:'',supportHours:'',returnDays:7,returnTerms:'Contact support',taxBasisPoints:0};
  await assertFails(setDoc(doc(buyerDb,'shop/settings'),config));
  await assertSucceeds(setDoc(doc(adminDb,'shop/settings'),config));
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'shop/settings')));
  await assertFails(updateDoc(doc(adminDb,'shop/settings'),{taxBasisPoints:-1}));
  await assertSucceeds(setDoc(doc(adminDb,'product_costs/laptop'),{cost:2000}));
  await assertFails(getDoc(doc(buyerDb,'product_costs/laptop')));
  await assertFails(setDoc(doc(buyerDb,'payment_intents/forged'),{verified:true}));
  await assertFails(setDoc(doc(buyerDb,'reservation_queue/forged'),{expires_at:0}));
  await assertFails(setDoc(doc(adminDb,'products/laptop/reviews/forged'),{rating:5}));
});
test('even admin cannot overwrite or delete stock held for checkout',async()=>{
  await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'products/held'),{name:'Phone',category:'phone',price:100,stock:0,reserved:1,rating:0,description:'Phone',specs:[],image:''}));
  const ref=doc(env.authenticatedContext('manager',{admin:true}).firestore(),'products/held');
  await assertFails(updateDoc(ref,{stock:10}));await assertFails(deleteDoc(ref));
});
