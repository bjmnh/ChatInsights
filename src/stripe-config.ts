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
    id: 'prod_SVdp4aMaUkItXT',
    priceId: 'price_1RacYAQSrLveGa6rriCJf0nu',
    name: 'Free Version',
    description: 'Get started with basic conversation analytics and insights. Perfect for trying out ChatInsights.',
    mode: 'payment',
    price: 0,
    currency: 'usd',
  },
  {
    id: 'prod_SVbpaHbrdScZy7',
    priceId: 'price_1Rad3iQSrLveGa6rUMWt9SWj',
    name: 'ChatInsights Premium',
    description: 'Unlock advanced insights including The Digital Mirror, Hidden Patterns, and The Revelation Map. Discover what your conversations really reveal about you.',
    mode: 'subscription',
    price: 24.99,
    currency: 'usd',
    interval: 'month',
  },
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

export const getPremiumProduct = (): Product | undefined => {
  return products.find(product => product.id === 'prod_SVbpaHbrdScZy7');
};