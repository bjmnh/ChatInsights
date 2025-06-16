import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
  Star,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { StripeService } from '../services/stripeService';
import { products, getProductById, getFreeTrialProduct } from '../stripe-config';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const premiumProduct = getProductById('prod_SVbpaHbrdScZy7');
  const freeTrialProduct = getFreeTrialProduct();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [subscriptionData, ordersData] = await Promise.all([
        StripeService.getUserSubscription(),
        StripeService.getUserOrders(),
      ]);

      setSubscription(subscriptionData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handlePurchase = async (product = premiumProduct) => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (!product) {
      toast.error('Product not found');
      return;
    }

    setIsLoading(true);
    try {
      await StripeService.purchaseProduct(product);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeTrialPurchase = () => {
    if (!freeTrialProduct) {
      toast.error('Free trial product not configured. Please contact support.');
      return;
    }
    handlePurchase(freeTrialProduct);
  };

  const hasActiveSubscription = StripeService.hasActiveSubscription(subscription);
  const hasPurchasedPremium = StripeService.hasPurchasedProduct(orders, premiumProduct?.priceId || '');
  const hasPurchasedFreeTrial = freeTrialProduct ? StripeService.hasPurchasedProduct(orders, freeTrialProduct.priceId) : false;
  const isPremiumUser = hasActiveSubscription || hasPurchasedPremium || hasPurchasedFreeTrial;

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
      alternative: "The AI's Dossier"
    },
    {
      icon: <Search className="h-6 w-6" />,
      name: "Hidden Patterns",
      description: "Uncover the recurring themes, anxieties, and personal details you've unknowingly cataloged. What has your digital subconscious revealed?",
      alternative: "The Unconscious Archive"
    },
    {
      icon: <Network className="h-6 w-6" />,
      name: "The Revelation Map",
      description: "Connect the dots across months of conversations. We trace the narrative threads you've woven, revealing the grand story your subconscious has been telling.",
      alternative: "Digital Archaeology"
    }
  ];

  const testimonials = [
    {
      name: "Maya K.",
      role: "Freelance Writer",
      content: "I genuinely gasped. Chat Insights showed me a timeline of my health queries and anxieties I'd discussed over months. Seeing it all laid out was... intense. It was a stark reminder of what I'd put out there, even if just to an AI.",
      plan: "Premium"
    },
    {
      name: "Ben S.",
      role: "Software Developer",
      content: "The 'Hidden Patterns' feature was an eye-opener. It flagged how often I'd mentioned details about past projects, old colleagues, even my partner's job hunt. Things I'd completely forgotten I'd typed. Made me rethink what I casually share.",
      plan: "Premium"
    },
    {
      name: "Dr. Evelyn Reed",
      role: "Researcher",
      content: "The 'Digital Mirror' was unsettlingly accurate. The inferred personality traits and even some of my niche academic interests were spot on. It's like looking at an objective, if slightly unnerving, reflection built from pure data.",
      plan: "Premium"
    },
    {
      name: "Chloe T.",
      role: "Artist",
      content: "I use ChatGPT for brainstorming a lot. 'The Revelation Map' highlighted recurring symbols and anxieties in my creative ideation that I hadn't consciously connected. It's like my own AI-powered dream journal analysis. Fascinating, and a little bit spooky!",
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
          Start with basic insights, or dare to see what your conversations really reveal about you
        </p>
        
        {/* Product Configuration Notice */}
        {!freeTrialProduct && (
          <Alert className="max-w-2xl mx-auto mb-8 border-orange-200 bg-orange-50">
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuration Needed:</strong> To enable the free trial option, please add your $0 Stripe product 
              to the configuration. Go to your Stripe Dashboard, copy the Product ID and Price ID, and add them to 
              <code className="mx-1 px-1 bg-orange-100 rounded">src/stripe-config.ts</code>.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Annual/Monthly Toggle - Hidden for now since we only have one-time payment */}
        <div className="hidden items-center justify-center space-x-4 mb-8">
          <span className={`text-sm ${!isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <span className={`text-sm ${isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
            Annual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2">
              Save 20%
            </Badge>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Free</CardTitle>
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
                disabled={!user || (!isPremiumUser && !dataLoading)}
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
                Unlock Your Secrets
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
                  ${premiumProduct?.price || '9.99'}
                </span>
                <span className="text-muted-foreground">/one-time</span>
                {freeTrialProduct && (
                  <div className="text-sm text-blue-600 font-medium mt-1">
                    Free trial available
                  </div>
                )}
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
              
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => handlePurchase()}
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
                
                {freeTrialProduct && !isPremiumUser && user && (
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={handleFreeTrialPurchase}
                    disabled={isLoading || dataLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Try Premium Free
                      </>
                    )}
                  </Button>
                )}
              </div>
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
                  <p className="text-muted-foreground text-sm mb-3">{feature.description}</p>
                  <Badge variant="outline" className="text-xs">
                    Also known as: {feature.alternative}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="container mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Free vs Premium Insights</h2>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>Surface Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Basic conversation metrics and patterns—what you'd expect from any analytics tool.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Free</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex justify-between">
                    <span>Premium</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-8 w-8 text-purple-500 mb-2" />
                <CardTitle>Psychological Profiling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Deep personality analysis and behavioral predictions based on your conversation patterns.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Free</span>
                    <span className="text-muted-foreground">—</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lightbulb className="h-8 w-8 text-yellow-500 mb-2" />
                <CardTitle>Hidden Revelations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Uncover the unconscious patterns, recurring themes, and personal details you never realized you'd shared.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Free</span>
                    <span className="text-muted-foreground">—</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
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

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How revealing are the premium insights?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Premium insights analyze patterns in what you've already shared with AI. They don't create new information, 
                but they reveal connections and themes you may not have consciously noticed. Many users are surprised 
                by what their conversation patterns reveal about their interests, concerns, and personality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is my conversation data secure?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes, we take privacy seriously. Your raw conversation data is automatically deleted within hours 
                of analysis completion. We retain only the generated insights, which you can delete at any time. 
                Your data is encrypted and processed securely throughout.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is this a subscription or one-time payment?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Premium is currently a one-time payment of ${premiumProduct?.price || '9.99'}. Once purchased, you'll have 
                permanent access to all premium features with no recurring charges. This gives you unlimited analyses 
                and access to all advanced insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What if the insights are too revealing?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You have complete control over your data. You can delete individual reports or your entire account 
                at any time. The insights are based on what you've already shared with AI—we're just helping you 
                see the patterns. Think of it as a mirror, not a magnifying glass.
              </p>
            </CardContent>
          </Card>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => handlePurchase()}
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
                  Unlock Your Digital Self
                </>
              )}
            </Button>
            
            {freeTrialProduct && !isPremiumUser && user && (
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleFreeTrialPurchase}
                disabled={isLoading}
                className="text-lg px-8 py-6 bg-white/10 border-white/20 hover:bg-white/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Try Free First
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;