import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Check, 
  Crown, 
  Zap, 
  Shield, 
  BarChart3, 
  Brain,
  MessageSquare,
  TrendingUp,
  Users,
  Lightbulb,
  Eye,
  Search,
  Network,
  Loader2,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { StripeService } from '../services/stripeService';
import { getPremiumProduct } from '../stripe-config';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const premiumProduct = getPremiumProduct();

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setDataLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const ordersData = await StripeService.getUserOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (!premiumProduct) {
      toast.error('Product not found');
      return;
    }

    setIsLoading(true);
    try {
      await StripeService.purchaseProduct(premiumProduct);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isPremiumUser = StripeService.isPremiumUser(orders);

  const features = {
    free: [
      'Up to 3 conversation analyses',
      'Basic engagement metrics',
      'Topic distribution analysis',
      'Communication style overview',
      'Activity patterns',
      'Standard support'
    ],
    premium: [
      'Unlimited conversation analyses',
      'The Digital Mirror: AI personality profiling',
      'Hidden Patterns: Unconscious theme discovery',
      'The Revelation Map: Cross-conversation connections',
      'Emotional archaeology of your chats',
      'Advanced behavioral predictions',
      'What you unknowingly revealed analysis',
      'Custom deep-dive reports',
      'Priority support',
      'Data export capabilities'
    ]
  };

  const premiumFeatures = [
    {
      icon: <Eye className="h-6 w-6" />,
      name: "The Digital Mirror",
      description: "See yourself as the AI sees you. Discover the personality profile built from your digital conversations—it might be unsettlingly accurate.",
    },
    {
      icon: <Search className="h-6 w-6" />,
      name: "Hidden Patterns",
      description: "Uncover the recurring themes, anxieties, and personal details you've unknowingly cataloged. What has your digital subconscious revealed?",
    },
    {
      icon: <Network className="h-6 w-6" />,
      name: "The Revelation Map",
      description: "Connect the dots across months of conversations. We trace the narrative threads you've woven, revealing the grand story your subconscious has been telling.",
    }
  ];

  const testimonials = [
    {
      name: "Maya K.",
      role: "Freelance Writer",
      content: "I genuinely gasped. Chat Insights showed me a timeline of my health queries and anxieties I'd discussed over months. Seeing it all laid out was... intense.",
      plan: "Premium"
    },
    {
      name: "Ben S.",
      role: "Software Developer",
      content: "The 'Hidden Patterns' feature was an eye-opener. It flagged how often I'd mentioned details about past projects, old colleagues, even my partner's job hunt.",
      plan: "Premium"
    },
    {
      name: "Dr. Evelyn Reed",
      role: "Researcher",
      content: "The 'Digital Mirror' was unsettlingly accurate. The inferred personality traits and even some of my niche academic interests were spot on.",
      plan: "Premium"
    }
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold mb-6">
          Choose Your Level of Self-Discovery
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Start with basic insights, or unlock the full power of your conversation data
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Free Version</CardTitle>
                  <CardDescription>Perfect for trying out ChatInsights</CardDescription>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={!user}
                onClick={() => !user && toast.info('Sign up to get started with the free version')}
              >
                {!user ? 'Sign Up to Start' : 'Current Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="px-3 py-1">
                <Crown className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Premium</CardTitle>
                  <CardDescription>Discover what you've unknowingly revealed</CardDescription>
                </div>
                <Crown className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  ${premiumProduct?.price || '10'}
                </span>
                <span className="text-muted-foreground"> one-time</span>
              </div>
            </CardHeader>
            <CardContent>
              {isPremiumUser && (
                <Alert className="mb-6 border-green-200 bg-green-50">
                  <Crown className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>You have Premium access!</strong> All features are unlocked.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">Prepare to be surprised</h4>
                <p className="text-sm text-muted-foreground">
                  Premium reveals patterns, themes, and personal details you never realized you'd shared. 
                  It's a mirror to your digital subconscious—fascinating and sometimes unsettling.
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {features.premium.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                onClick={handlePurchase}
                disabled={isLoading || isPremiumUser || !user || dataLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isPremiumUser ? (
                  'Already Purchased'
                ) : !user ? (
                  'Sign In to Purchase'
                ) : (
                  'Unlock Your Digital Self'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Premium Features Deep Dive */}
      <section className="container mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-4">What Premium Reveals</h2>
        <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
          These aren't just analytics—they're revelations about the digital trail you've left behind. 
          Prepare to see yourself through the lens of your own data.
        </p>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {premiumFeatures.map((feature, index) => (
              <Card key={index} className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">What Premium Users Discovered</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Real reactions from users who dared to see what their conversations revealed
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                    <Badge variant="secondary">{testimonial.plan}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to See What You've Revealed?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands who have discovered the hidden patterns in their digital conversations. 
            Some insights might surprise you.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={handlePurchase}
            disabled={isLoading || isPremiumUser || !user}
            className="text-lg px-8 py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : isPremiumUser ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                You Have Premium!
              </>
            ) : !user ? (
              'Sign In to Purchase'
            ) : (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Unlock Your Digital Self - $10
              </>
            )}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;