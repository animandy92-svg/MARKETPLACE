import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Store, Grid3X3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ProductCard } from '../components/ProductCard';
import { categories } from '../data/categories';
import { Product } from '../data/products';
import { db } from '../lib/firebase';

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => onSnapshot(collection(db, 'products'), (snapshot) => {
    const all = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      .filter((item: any) => item.status !== 'sold' && item.active !== false) as Product[];
    const diverse = [...new Set(all.map((item) => item.category))]
      .map((category) => all.find((item) => item.category === category)!);
    setFeatured([...diverse, ...all.filter((item) => !diverse.some((first) => first.id === item.id))].slice(0, 8));
    setLoading(false);
  }, () => setLoading(false)), []);

  return <div className="space-y-16">
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-rose-50">
      <div className="container mx-auto px-4 py-14 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-primary/10 text-primary font-medium">
            <ShoppingBag className="h-4 w-4" /> A little of everything. All in one place.
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="gradient-text">Everyday finds.</span><br />Endless possibilities.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            From dresses and kitchen appliances to calculators, school supplies, phones, and furniture.
            Find what you need at Jack of All Trades.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/products"><Button size="lg" className="shadow-lg shadow-primary/20">
              Explore the Marketplace <ArrowRight className="ml-2 h-4 w-4" />
            </Button></Link>
            <Link to="/sell"><Button size="lg" variant="outline"><Store className="mr-2 h-4 w-4" /> Start Selling</Button></Link>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Grid3X3 className="h-4 w-4 text-primary" /> Categories for every day</span>
            <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> Something for everyone</span>
          </div>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 max-w-lg w-full mx-auto">
          {categories.slice(0, 4).map((category, index) => <motion.div key={category.id}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .1 }}
            className={index % 2 ? 'translate-y-5' : ''}>
            <Link to={'/products?category=' + category.id} className={'group block rounded-3xl p-6 sm:p-8 bg-gradient-to-br ' + category.gradient + ' text-white shadow-xl shadow-primary/10 hover:-translate-y-1 transition-transform'}>
              <span aria-hidden="true" className="text-5xl sm:text-6xl block mb-5">{category.icon}</span>
              <h2 className="text-lg sm:text-xl font-bold mb-2">{category.name}</h2>
              <p className="text-sm text-white/85">{category.description}</p>
              <ArrowRight className="h-5 w-5 mt-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>)}
        </div>
      </div>
    </section>
    <section className="container mx-auto px-4">
      <div className="text-center mb-10"><h2 className="text-3xl font-bold mb-3">Shop your world</h2>
        <p className="text-muted-foreground">Big purchases, daily essentials, and everything in between.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category) => <Link key={category.id} to={'/products?category=' + category.id}>
          <Card className="h-full border-0 shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-shadow">
            <CardContent className="p-5 flex items-start gap-4">
              <span aria-hidden="true" className="text-3xl">{category.icon}</span>
              <div><h3 className="font-semibold mb-1">{category.name}</h3><p className="text-sm text-muted-foreground">{category.description}</p></div>
            </CardContent>
          </Card>
        </Link>)}
      </div>
    </section>
    <section className="container mx-auto px-4">
      <div className="flex justify-between items-center gap-4 mb-8">
        <div><h2 className="text-3xl font-bold mb-2">Discover the marketplace</h2><p className="text-muted-foreground">Explore items currently available from our catalog.</p></div>
        <Link to="/products"><Button variant="ghost">View All <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </div>
      {loading ? <p className="text-muted-foreground">Loading products…</p> : featured.length > 0
        ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{featured.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
        : <Card><CardContent className="p-8 text-center text-muted-foreground">New finds are on their way. Browse categories or apply to sell your products.</CardContent></Card>}
    </section>
    <section className="container mx-auto px-4">
      <div className="rounded-3xl p-8 md:p-12 text-center text-white space-y-6" style={{ background: 'var(--gradient-hero)' }}>
        <h2 className="text-3xl md:text-4xl font-bold">What do you have to sell?</h2>
        <p className="text-indigo-100 max-w-xl mx-auto">Clothing, appliances, books, household goods, electronics, or something entirely different. There is room for your products here.</p>
        <Link to="/sell" className="inline-block"><Button size="lg" className="bg-white text-primary hover:bg-white/90">Join the Marketplace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </div>
    </section>
  </div>;
}
