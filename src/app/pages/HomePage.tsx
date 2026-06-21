import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ProductCard } from '../components/ProductCard';
import { products } from '../data/products';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const categories = [
  {
    name: 'Phones',
    icon: '📱',
    description: 'Latest smartphones from top brands',
    link: '/products?category=phone',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
  },
  {
    name: 'Laptops',
    icon: '💻',
    description: 'Powerful laptops for work and play',
    link: '/products?category=laptop',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
  },
  {
    name: 'Tablets',
    icon: '📲',
    description: 'Versatile tablets for every need',
    link: '/products?category=tablet',
    gradient: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50',
  },
  {
    name: 'Smartwatches',
    icon: '⌚',
    description: 'Stay connected on your wrist',
    link: '/products?category=smartwatch',
    gradient: 'from-rose-500 to-pink-600',
    lightBg: 'bg-rose-50',
  },
  {
    name: 'Accessories',
    icon: '🎧',
    description: 'Enhance your tech experience',
    link: '/products?category=accessory',
    gradient: 'from-cyan-500 to-sky-600',
    lightBg: 'bg-cyan-50',
  },
];

const heroSlides = [
  {
    product: products[0],
    tagline: 'Discover the Latest',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    product: products[2],
    tagline: 'Power Meets Design',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    product: products[7],
    tagline: 'Create Without Limits',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    product: products[8],
    tagline: 'Stay Connected',
    accent: 'from-rose-500 to-pink-600',
  },
];

export function HomePage() {
  const featuredProducts = products.slice(0, 4);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
            animate={{ scale: [1, 0.9, 1.1, 1], rotate: [0, -10, 5, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
                  Welcome to Jack of all Trades
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <span className="gradient-text">Your One-Stop</span>
                <br />
                <span className="text-foreground">Tech Shop</span>
              </motion.h1>

              <motion.p
                className="text-lg text-muted-foreground max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Discover the latest phones, laptops, tablets, and accessories at unbeatable prices
              </motion.p>

              <motion.div
                className="flex gap-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <Link to="/products">
                  <Button size="lg" className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/sell">
                  <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
                    Start Selling
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right: Slideshow */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Glow effect behind slide */}
                <motion.div
                  className={`absolute inset-0 rounded-3xl blur-3xl opacity-30 bg-gradient-to-br ${heroSlides[currentSlide].accent}`}
                  animate={{ opacity: [0.2, 0.35, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Slide content */}
                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-primary/10 p-8 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-6"
                    >
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${heroSlides[currentSlide].accent}`}>
                        {heroSlides[currentSlide].tagline}
                      </span>
                      <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                        <ImageWithFallback
                          src={heroSlides[currentSlide].product.image}
                          alt={heroSlides[currentSlide].product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg">{heroSlides[currentSlide].product.name}</h3>
                        <p className="text-sm text-muted-foreground">{heroSlides[currentSlide].product.description}</p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Slide indicators */}
                <div className="flex justify-center gap-2 mt-6">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? 'w-8 bg-gradient-to-r from-primary to-purple-500'
                          : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold mb-3">Shop by Category</h2>
          <p className="text-muted-foreground">Find exactly what you need</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
            >
              <Link to={category.link}>
                <Card className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer h-full border-0 overflow-hidden">
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <motion.div
                      className={`p-5 rounded-2xl ${category.lightBg} bg-gradient-to-br ${category.gradient} bg-opacity-10`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <span className="text-3xl block">{category.icon}</span>
                    </motion.div>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-10"
        >
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
            <p className="text-muted-foreground">Handpicked for you</p>
          </div>
          <Link to="/products">
            <Button variant="ghost" className="group">
              View All
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{ background: 'var(--gradient-hero)' }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Start Selling?</h2>
            <p className="text-indigo-100 max-w-lg mx-auto">
              Join our marketplace and reach thousands of customers looking for the latest tech
            </p>
            <Link to="/sell">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
