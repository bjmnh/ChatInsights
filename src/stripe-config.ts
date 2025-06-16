export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  interval?: 'month' | 'year';
}

export const products: Product[] = [
  {
    id: 'prod_SVbpaHbrdScZy7',
    priceId: 'price_1RaacGQSrLveGa6rGX1kBexA',
    name: 'ChatInsights Premium',
    description: 'Unlock advanced insights including The Digital Mirror, Hidden Patterns, and The Revelation Map. Discover what your conversations really reveal about you.',
    mode: 'payment',
    price: 9.99,
    currency: 'usd',
  },
  // TODO: Add your new $0 Stripe product here
  // Copy the Product ID and Price ID from your Stripe Dashboard
  // Example:
  // {
  //   id: 'prod_YOUR_PRODUCT_ID',
  //   priceId: 'price_YOUR_PRICE_ID',
  //   name: 'ChatInsights Free Trial',
  //   description: 'Try ChatInsights Premium features for free',
  //   mode: 'payment',
  //   price: 0,
  //   currency: 'usd',
  // },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};

export const getFreeTrialProduct = (): Product | undefined => {
  return products.find(product => product.price === 0);
};