import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { WishlistButton } from './WishlistButton';
import { Product } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatCurrency } from '../utils/formatCurrency';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const categoryColors: Record<string, { border: string; bg: string; gradient: string }> = {
  phone: { border: 'border-l-blue-500', bg: 'bg-blue-50', gradient: 'from-blue-500 to-blue-600' },
  laptop: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-emerald-600' },
  tablet: { border: 'border-l-amber-500', bg: 'bg-amber-50', gradient: 'from-amber-500 to-amber-600' },
  smartwatch: { border: 'border-l-rose-500', bg: 'bg-rose-50', gradient: 'from-rose-500 to-rose-600' },
  accessory: { border: 'border-l-cyan-500', bg: 'bg-cyan-50', gradient: 'from-cyan-500 to-cyan-600' },
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const colors = categoryColors[product.category] || categoryColors.accessory;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
    >
      <Link to={`/product/${product.id}`}>
        <Card
          className={`group h-full border-l-4 ${colors.border} hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-white`}
        >
          <CardContent className="p-4">
            <div className="aspect-square relative mb-4 overflow-hidden rounded-lg bg-muted">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110 group-hover:brightness-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-2 left-2">
                <WishlistButton productId={product.id} />
              </div>
              {product.stock < 10 && (
                <Badge variant="destructive" className="absolute top-2 right-2 shadow-lg">
                  Low Stock
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{product.rating}</span>
              </div>

              <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors duration-200">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0 flex items-center justify-between">
            <span className={`text-2xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
              {formatCurrency(product.price)}
            </span>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
