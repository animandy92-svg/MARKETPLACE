import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:marketplace/models/product.dart';
import 'package:marketplace/widgets/product_tile.dart';

Product item(
  String id,
  String name,
  String category,
  double price, {
  int stock = 3,
}) => Product(
  id: id,
  name: name,
  category: category,
  price: price,
  description: 'Everyday essentials',
  image: '',
  stock: stock,
  rating: 4,
  specs: [],
);

void main() {
  test(
    'general marketplace categories and search work without tech assumptions',
    () {
      final catalog = [
        item('dress', 'Summer Dress', 'fashion', 80),
        item('calc', 'Calculator', 'school', 25),
        item('fan', 'Standing Fan', 'appliance', 160),
        item('phone', 'Phone', 'phone', 700),
      ];
      expect(filterProducts(catalog, category: 'fashion').single.id, 'dress');
      expect(filterProducts(catalog, search: 'CALCULATOR').single.id, 'calc');
      expect(filterProducts(catalog, sort: 'price-low').first.id, 'calc');
      expect(filterProducts(catalog, sort: 'price-high').first.id, 'phone');
      expect(catalog.first.id, 'dress');
    },
  );
  test('a stock-only cart document joins the current catalog product', () {
    final product = Product.fromMap('dress', {
      'name': 'Dress',
      'category': 'fashion',
      'price': 80,
      'stock': 2,
      'specs': ['Size M'],
    });
    final line = CartLine(product, 2);
    expect(line.total, 160);
    expect(line.toRequest(), {'productId': 'dress', 'quantity': 2});
    expect(product.specs, ['Size M']);
  });
  test('sold and hidden product flags are recognized', () {
    expect(Product.fromMap('sold', {'status': 'sold'}).active, isFalse);
    expect(Product.fromMap('hidden', {'active': false}).active, isFalse);
    expect(Product.fromMap('legacy', {}).active, isTrue);
  });
  testWidgets('product cards show general goods and add available products', (
    tester,
  ) async {
    var added = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 220,
            height: 310,
            child: ProductTile(
              product: item('dress', 'Summer Dress', 'fashion', 80),
              onOpen: () {},
              onAdd: () => added = true,
            ),
          ),
        ),
      ),
    );
    expect(find.text('Summer Dress'), findsOneWidget);
    expect(find.text('GH₵ 80.00'), findsOneWidget);
    await tester.tap(find.byTooltip('Add to cart'));
    expect(added, isTrue);
    expect(tester.takeException(), isNull);
  });
  testWidgets('sold-out cards disable adding to cart', (tester) async {
    var added = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 220,
            height: 310,
            child: ProductTile(
              product: item('fan', 'Standing Fan', 'appliance', 160, stock: 0),
              onOpen: () {},
              onAdd: () => added = true,
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('Add to cart'));
    expect(added, isFalse);
    expect(find.textContaining('Sold out'), findsOneWidget);
  });
}
