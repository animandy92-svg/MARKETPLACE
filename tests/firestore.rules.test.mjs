import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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
