import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Check, ShoppingCart, Star } from 'lucide-react';
import { db } from '../lib/firebase';
import { Product } from '../data/products';
import { categoryLabel } from '../data/categories';
import { ProductCard } from '../components/ProductCard';
import { WishlistButton } from '../components/WishlistButton';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviews,setReviews] = useState<any[]>([]);
  useEffect(() => { if (!id) return; return onSnapshot(collection(db,'products',id,'reviews'),snap=>setReviews(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{}); }, [id]);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    return onSnapshot(doc(db, 'products', id), (snapshot) => {
      setProduct(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Product : null);
      setLoading(false);
    }, () => { setError(true); setLoading(false); });
  }, [id]);
  useEffect(() => {
    if (!product) return;
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      setRelated(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Product[]);
    });
  }, [product?.category]);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center">Loading product…</div>;
  if (!product || error) return <div className="container mx-auto px-4 py-16 text-center space-y-5">
    <h1 className="text-2xl font-bold">{error ? 'Could not load this product' : 'Product not found'}</h1>
    <Link to="/products"><Button>Browse Products</Button></Link>
  </div>;
  return <div className="container mx-auto px-4 py-8">
    <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-8"><ArrowLeft className="h-4 w-4" /> Back to Products</Link>
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-xl shadow-primary/5">
        <ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="space-y-6">
        <Badge variant="secondary" className="bg-primary/10 text-primary">{categoryLabel(product.category)}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-2">{product.review_count ? <><Star className="h-5 w-5 fill-amber-400 text-amber-400" /><span>{Number(product.rating).toFixed(1)} out of 5 · {product.review_count} purchase-backed reviews</span></> : <span className="text-sm text-muted-foreground">No reviews yet</span>}</div>
        {product.condition && <p className="text-sm capitalize">Condition: {product.condition.replaceAll('-',' ')}</p>}
        <p className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</p>
        <p className="text-muted-foreground text-lg leading-relaxed">{product.description}</p>
        {!!product.specs?.length && <div className="space-y-3"><h2 className="font-bold text-lg">Item details</h2>
          {product.specs.map((spec, index) => <div key={index} className="flex gap-3"><Check className="h-5 w-5 text-primary shrink-0" /><span>{spec}</span></div>)}
        </div>}
        <p className={product.verified === true && product.stock > 0 ? 'text-emerald-700' : 'text-muted-foreground'}>{product.verified !== true ? 'Stock and condition must be checked before ordering. Contact us for availability.' : product.stock > 0 ? product.stock + ' available' : 'Out of stock'}</p>
        <div className="flex gap-3"><Button size="lg" disabled={product.verified !== true || product.stock <= 0 || product.active === false || product.status === 'sold'} onClick={() => addToCart(product)}>
          <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart</Button><WishlistButton productId={product.id} /></div>
      </div>
    </div>
    <section className="mt-12 policy-panel space-y-4"><h2 className="text-xl font-bold">From people who bought it</h2>{reviews.length ? reviews.map(review=><div className="border-t pt-4" key={review.id}><p className="text-sm font-semibold">{'★'.repeat(review.rating)} · Verified purchase</p><p className="mt-2 text-muted-foreground">{review.comment}</p></div>) : <p className="text-sm text-muted-foreground">No reviews yet. Customers can review an item after delivery.</p>}<Link to="/help" className="inline-block text-sm text-primary underline">Delivery, returns, and support</Link></section>
    {related.some((item) => item.category === product.category && item.id !== product.id) && <section className="mt-16">
      <h2 className="text-2xl font-bold mb-6">More in {categoryLabel(product.category)}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {related.filter((item) => item.category === product.category && item.id !== product.id && item.active !== false && item.status !== 'sold').slice(0, 4).map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}
      </div>
    </section>}
  </div>;
}
