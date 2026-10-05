import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Search, Smartphone, Laptop, BookOpen, Shirt, Truck, Headphones, Sparkles, MapPin, Plus, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { categories } from '../data/categories';
import { Product } from '../data/products';
import { db } from '../lib/firebase';
import { useShop, communityUrl } from '../lib/shop';
import { formatCurrency } from '../utils/formatCurrency';

const moods = [
  { id: 'phone', label: 'Stay connected', title: 'Phones & accessories', description: 'Your next phone. Your everyday connection.', icon: Smartphone, color: '#dbecff' },
  { id: 'laptop', label: 'Get things done', title: 'Laptops & work essentials', description: 'For assignments, big ideas, and everything after.', icon: Laptop, color: '#e9e5fa' },
  { id: 'school', label: 'Study smarter', title: 'School & office', description: 'Small essentials for your next big chapter.', icon: BookOpen, color: '#ffe9be' },
  { id: 'fashion', label: 'Find your style', title: 'Fashion & clothing', description: 'A fresh find for a little more you.', icon: Shirt, color: '#fce0d6' },
];

function EverydayIllustration({ selected }: { selected: number }) {
  return <div className="everyday-scene" aria-hidden="true">
    <div className="scene-orbit" /><div className="scene-dot dot-one" /><div className="scene-dot dot-two" /><Plus className="scene-spark" />
    <div className={'illustration-laptop ' + (selected === 1 ? 'spotlight' : '')}><div className="laptop-screen"><div className="screen-window"><span /><span /><span /><div className="screen-line" /><div className="screen-line short" /><div className="screen-grid"><i /><i /><i /></div></div></div><div className="laptop-base" /></div>
    <div className={'illustration-phone ' + (selected === 0 ? 'spotlight' : '')}><div className="phone-notch" /><div className="phone-sun" /><div className="phone-wave" /><div className="phone-wave second" /><div className="phone-apps"><i /><i /><i /></div></div>
    <div className={'illustration-book ' + (selected === 2 ? 'spotlight' : '')}><div className="book-spine" /><BookOpen /><span>GOOD<br />IDEAS<br />START HERE.</span></div>
    <div className={'illustration-bag ' + (selected === 3 ? 'spotlight' : '')}><div className="bag-handle" /><span>j.</span><Sparkles /></div>
    <div className="scene-sticker"><Sparkles className="w-4 h-4" /> A little of everything.</div>
  </div>;
}

export function HomePage() {
  const shop = useShop(), navigate = useNavigate(), reduceMotion = useReducedMotion();
  const [all, setAll] = useState<Product[]>([]), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0), [search, setSearch] = useState(''), [budget, setBudget] = useState(1000);
  const [finderCategory, setFinderCategory] = useState('all');
  useEffect(() => onSnapshot(collection(db, 'products'), snap => {
    setAll(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((p: any) => p.status !== 'sold' && p.status !== 'draft' && p.active !== false) as Product[]);
    setLoading(false); setFailed(false);
  }, () => { setLoading(false); setFailed(true); }), []);
  const picks = all.filter(p => p.stock > 0).slice(0, 8);
  const matching = all.filter(p => p.price <= budget && (finderCategory === 'all' || p.category === finderCategory));
  const mood = moods[selected], Icon = mood.icon;
  const deliveryReady = shop.deliveryZones.length > 0;
  return <div className="home-page">
    <section className="market-hero">
      <div className="container mx-auto px-4 hero-grid">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-copy">
          <div className="hero-kicker"><span className="live-dot" /> YOUR EVERYDAY MARKETPLACE · GHANA</div>
          <h1>Dream it.<br /><span className="hero-emphasis">Own it.<svg viewBox="0 0 360 18" preserveAspectRatio="none"><path d="M3 12Q150 -4 357 10" /></svg></span></h1>
          <p className="hero-description">Phones, laptops, study essentials, and a little more you. Discover your next everyday find in {shop.serviceArea || 'Ghana'}.</p>
          <form className="hero-search" onSubmit={e => { e.preventDefault(); navigate('/products?q=' + encodeURIComponent(search)); }}>
            <Search className="w-5 shrink-0" /><input aria-label="Search the marketplace" placeholder="What are you looking for?" value={search} onChange={e => setSearch(e.target.value)} /><button type="submit" aria-label="Search"><ArrowRight className="w-5" /></button>
          </form>
          <div className="hero-actions"><Link to="/products" className="shop-cta">Explore the finds <ArrowUpRight className="w-4" /></Link><Link to="/sell" className="seller-link">Got something to sell? <ArrowRight className="w-4" /></Link></div>
          <div className="hero-service"><MapPin className="w-4 shrink-0" /><span>{deliveryReady ? `${shop.serviceArea} · ${shop.deliveryZones[0].timing}` : 'Ghana pilot · check delivery with us'}<Link to="/delivery" className="ml-2 underline underline-offset-4">Details</Link></span></div>
        </motion.div>
        <div className="hero-visual"><div className="visual-heading">YOUR NEXT <span>little discovery.</span></div><EverydayIllustration selected={selected} />
          <div className="hero-mood-tabs" aria-label="Explore everyday categories">{moods.map((m, i) => <button key={m.id} aria-pressed={selected === i} onClick={() => setSelected(i)} className={selected === i ? 'selected' : ''}><m.icon className="w-4" /><span>{m.label}</span></button>)}</div>
          <AnimatePresence mode="wait"><motion.div key={mood.id} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mood-caption"><div><h2>{mood.title}</h2><p>{mood.description}</p></div><Link aria-label={'Browse ' + mood.title} to={'/products?category=' + mood.id}><ArrowUpRight /></Link></motion.div></AnimatePresence>
        </div>
      </div>
    </section>
    <div className="service-strip"><div className="container mx-auto px-4"><span><MapPin /> Finds for life in Ghana</span><span><Truck /> Delivery details before you pay</span><Link to="/help"><Headphones /> A real person to help</Link><Link to="/returns"><ArrowRight /> Clear returns, less guesswork</Link></div></div>
    <section className="container mx-auto px-4 section-space">
      <div className="section-heading"><div><p className="eyebrow">A place for every part of your day</p><h2>What’s your kind of find?</h2></div><Link to="/products">All categories <ArrowUpRight className="w-4" /></Link></div>
      <div className="main-categories">{moods.map((m, i) => <Link key={m.id} to={'/products?category=' + m.id} className="category-feature" style={{ background: m.color }}><span className="category-number">0{i + 1}</span><m.icon className="category-illustration" strokeWidth={1.25} /><div><h3>{m.title}</h3><p>{all.filter(p => p.category === m.id).length} catalog finds</p></div><ArrowUpRight className="category-arrow" /></Link>)}</div>
      <div className="category-pills">{categories.filter(c => !moods.some(m => m.id === c.id)).map(c => <Link to={'/products?category=' + c.id} key={c.id}><span aria-hidden="true">{c.icon}</span>{c.name}</Link>)}</div>
    </section>
    <section className="container mx-auto px-4 section-space">
      <div className="section-heading"><div><p className="eyebrow">Small catalog. Plenty to discover.</p><h2>Fresh on the shelf</h2></div><Link to="/products">Shop all finds <ArrowUpRight className="w-4" /></Link></div>
      {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Loading products">{[1,2,3,4].map(i => <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />)}</div>
        : picks.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{picks.map((p,i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
        : <div className="catalog-empty"><div className="empty-shelf"><Smartphone /><Laptop /><BookOpen /></div><h3>{failed ? 'The shelf is taking a moment to load' : 'Our first finds are on their way'}</h3><p>{failed ? 'Please refresh, or contact us for help.' : 'We’re building a small pilot catalog. Have phones, laptops, or everyday essentials to offer? Join our supplier shortlist.'}</p><Link to={failed ? '/help' : '/sell'}>{failed ? 'Get help' : 'Apply to sell'} <ArrowUpRight className="w-4" /></Link></div>}
    </section>
    <section className="container mx-auto px-4 section-space"><div className="budget-finder"><div><p className="eyebrow"><SlidersHorizontal className="w-4 inline mr-2" />THE LITTLE FINDER</p><h2>Your kind of find.<br />Your kind of budget.</h2><p>Move the slider. Pick a category.<br />Find what fits your day.</p></div>
      <div className="finder-controls"><label htmlFor="finder-category">I’m looking for</label><select id="finder-category" value={finderCategory} onChange={e => setFinderCategory(e.target.value)}><option value="all">A little of everything</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex justify-between mt-6"><label htmlFor="finder-budget">My budget, up to</label><output htmlFor="finder-budget" className="font-bold text-primary">{formatCurrency(budget)}</output></div><input id="finder-budget" aria-label="Maximum budget" type="range" min="50" max="20000" step="50" value={budget} onChange={e => setBudget(Number(e.target.value))} /><div className="finder-result" aria-live="polite"><span>{loading ? 'Checking the shelf…' : `${matching.length} ${matching.length === 1 ? 'find fits' : 'finds fit'} your budget`}</span><Link to={`/products?max=${budget}${finderCategory === 'all' ? '' : '&category=' + finderCategory}`}>Show me <ArrowRight className="w-4" /></Link></div></div>
    </div></section>
    <section className="container mx-auto px-4 section-space"><div className="sell-banner"><div className="seller-mark"><Icon strokeWidth={1} /></div><div><p className="eyebrow">A good find deserves a new home</p><h2>Something to sell?<br />Let’s start small, together.</h2><p>Join the pilot. Submit your photos and item details.<br />We review suppliers and listings before they go live.</p></div><Link to="/sell" className="shop-cta">Become a supplier <ArrowUpRight className="w-4" /></Link></div></section>
    <section className="container mx-auto px-4 section-space"><div className="flex flex-wrap gap-5 items-center justify-between border-t border-border pt-8"><div><p className="eyebrow">GOOD FINDS. GOOD COMPANY.</p><h2 className="text-2xl font-semibold mt-2">Come join the conversation.</h2><p className="text-sm text-muted-foreground mt-2">Meet the community and keep up with marketplace updates.</p></div><a href={communityUrl} target="_blank" rel="noreferrer" className="shop-cta">Join our WhatsApp community <ArrowUpRight className="w-4" /></a></div></section>
  </div>;
}
