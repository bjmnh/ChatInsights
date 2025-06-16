export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment';
  price: number;
  currency: string;
}

export const products: Product[] = [
  {
    id: 'premium',
    priceId: 'price_1RacYAQSrLveGa6rriCJf0nu', // Replace with your actual Stripe price ID
    name: 'ChatInsights Premium',
    description: 'Unlock all premium features including The Digital Mirror, Hidden Patterns, and advanced insights.',
    mode: 'payment',
    price: 10,
    currency: 'usd',
  },
];

export const getPremiumProduct = (): Product => {
  return products[0];
};

export const getProductByPriceId = (priceId: string): Product | undefined => {
  return products.find(product => product.priceId === priceId);
};