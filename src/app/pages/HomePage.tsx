import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ProductCard } from '../components/ProductCard';
import { products } from '../data/products';

const categories = [
  {
    name: 'Phones',
    icon: '📱',
    description: 'Latest smartphones from top brands',
    link: '/products?category=phone',
  },
  {
    name: 'Laptops',
    icon: '💻',
    description: 'Powerful laptops and tablets',
    link: '/products?category=laptop',
  },
  {
    name: 'Accessories',
    icon: '🎧',
    description: 'Enhance your tech experience',
    link: '/products?category=accessory',
  },
];

export function HomePage() {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.h1
            className="text-5xl md:text-6xl font-bold tracking-tight"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            Your One-Stop Tech Shop
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Discover the latest phones, laptops, and accessories at unbeatable prices
          </motion.p>
          <motion.div
            className="flex gap-4 justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Link to="/products">
              <Button size="lg">
                Shop Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.15, duration: 0.5 }}
            >
              <Link to={category.link}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <span className="text-3xl">{category.icon}</span>
                    </div>
                    <h3 className="text-xl font-semibold">{category.name}</h3>
                    <p className="text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <Link to="/products">
            <Button variant="ghost">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
