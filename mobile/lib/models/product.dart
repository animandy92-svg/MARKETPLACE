class Product {
  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.description,
    required this.image,
    required this.stock,
    required this.rating,
    required this.specs,
    this.active = true,
    this.reviewCount = 0,
    this.condition = 'new',
    this.verified = false,
    this.reserved = 0,
  });
  final String id, name, category, description, image;
  final double price, rating;
  final int stock;
  final List<String> specs;
  final bool active;
  final bool verified;
  final String condition;
  final int reviewCount, reserved;

  factory Product.fromMap(String id, Map<String, dynamic> data) => Product(
    id: id,
    name: data['name'] as String? ?? 'Product',
    category: data['category'] as String? ?? 'accessory',
    price: (data['price'] as num? ?? 0).toDouble(),
    description: data['description'] as String? ?? '',
    image: data['image'] as String? ?? '',
    stock: (data['stock'] as num? ?? 0).toInt(),
    rating: (data['rating'] as num? ?? 0).toDouble(),
    reviewCount: (data['review_count'] as num? ?? 0).toInt(),
    reserved: (data['reserved'] as num? ?? 0).toInt(),
    condition: data['condition'] as String? ?? 'new',
    verified: data['verified'] == true,
    specs: (data['specs'] as List? ?? [])
        .map((value) => value.toString())
        .toList(),
    active:
        data['active'] != false &&
        data['status'] != 'sold' &&
        data['status'] != 'draft',
  );
}

class CartLine {
  const CartLine(this.product, this.quantity);
  final Product product;
  final int quantity;
  double get total => product.price * quantity;
  Map<String, dynamic> toRequest() => {
    'productId': product.id,
    'quantity': quantity,
  };
}

String money(num amount) => 'GH₵ ${amount.toStringAsFixed(2)}';

List<Product> filterProducts(
  List<Product> source, {
  String search = '',
  String category = 'all',
  String sort = 'name',
}) {
  final term = search.trim().toLowerCase();
  final result = source
      .where(
        (product) =>
            (category == 'all' || product.category == category) &&
            (term.isEmpty ||
                '${product.name} ${product.description}'.toLowerCase().contains(
                  term,
                )),
      )
      .toList();
  result.sort(
    (a, b) => switch (sort) {
      'price-low' => a.price.compareTo(b.price),
      'price-high' => b.price.compareTo(a.price),
      'rating' => (b.reviewCount > 0 ? b.rating : 0).compareTo(
        a.reviewCount > 0 ? a.rating : 0,
      ),
      _ => a.name.compareTo(b.name),
    },
  );
  return result;
}
