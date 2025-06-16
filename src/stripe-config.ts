export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  isTest?: boolean;
}

export const products: Product[] = [
  {
    id: 'prod_test_free',
    priceId: 'price_test_free',
    name: 'ChatInsights Premium (Test)',
    description: 'Test the premium features with a $0 payment. This is for testing purposes only.',
    mode: 'payment',
    price: 0,
    currency: 'usd',
    isTest: true,
  },
  {
    id: 'prod_SVbpaHbrdScZy7',
    priceId: 'price_1RaacGQSrLveGa6rGX1kBexA',
    name: 'ChatInsights Premium',
    description: 'Unlock advanced insights including The Digital Mirror, Hidden Patterns, and The Revelation Map. Discover what your conversations really reveal about you.',
    mode: 'payment',
    price: 9.99,
    currency: 'usd',
  },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};

export const getTestProduct = (): Product => {
  return products.find(product => product.isTest) || products[0];
};