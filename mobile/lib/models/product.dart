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
  });
  final String id, name, category, description, image;
  final double price, rating;
  final int stock;
  final List<String> specs;
  final bool active;

  factory Product.fromMap(String id, Map<String, dynamic> data) => Product(
    id: id,
    name: data['name'] as String? ?? 'Product',
    category: data['category'] as String? ?? 'accessory',
    price: (data['price'] as num? ?? 0).toDouble(),
    description: data['description'] as String? ?? '',
    image: data['image'] as String? ?? '',
    stock: (data['stock'] as num? ?? 0).toInt(),
    rating: (data['rating'] as num? ?? 0).toDouble(),
    specs: (data['specs'] as List? ?? [])
        .map((value) => value.toString())
        .toList(),
    active: data['active'] != false && data['status'] != 'sold',
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
      'rating' => b.rating.compareTo(a.rating),
      _ => a.name.compareTo(b.name),
    },
  );
  return result;
}
