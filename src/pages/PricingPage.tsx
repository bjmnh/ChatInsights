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
  Database,
  Code,
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
      'Advanced behavioral profiling',
      'Machine learning pattern detection',
      'Cognitive style analysis',
      'Learning progression tracking',
      'Skill development insights',
      'Problem-solving methodology analysis',
      'Knowledge gap identification',
      'Custom deep-dive reports',
      'Priority support',
      'Data export capabilities'
    ]
  };

  const premiumFeatures = [
    {
      icon: <Database className="h-6 w-6" />,
      name: "Behavioral Profile Analysis",
      description: "Advanced ML analysis of cognitive patterns, learning styles, and problem-solving approaches extracted from conversation data.",
    },
    {
      icon: <Code className="h-6 w-6" />,
      name: "Data Pattern Detection",
      description: "Identify skill progression, learning velocity, and knowledge acquisition patterns using advanced data science techniques.",
    },
    {
      icon: <Network className="h-6 w-6" />,
      name: "Insight Mapping",
      description: "Connect patterns across conversations to reveal learning trajectories, skill development, and cognitive evolution over time.",
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Senior Software Engineer",
      content: "The behavioral analysis was incredibly accurate. It identified my learning patterns and problem-solving approach better than I could have described myself.",
      plan: "Premium"
    },
    {
      name: "Sarah Kim",
      role: "Data Scientist",
      content: "The pattern detection found clear progression in my technical skills over months. It's like having a data-driven career coach.",
      plan: "Premium"
    },
    {
      name: "Marcus Rodriguez",
      role: "Tech Lead",
      content: "As someone who values privacy, I appreciate the transparent data handling. The insights into my cognitive style were surprisingly detailed.",
      plan: "Premium"
    }
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold mb-6">
          Advanced Conversation Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Professional-grade analysis tools for developers who want data-driven insights into their learning and communication patterns
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
                  <CardTitle className="text-2xl">Basic Analytics</CardTitle>
                  <CardDescription>Essential conversation insights</CardDescription>
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
                onClick={() => !user && toast.info('Sign up to get started with basic analytics')}
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
                Professional
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Advanced Analytics</CardTitle>
                  <CardDescription>Professional-grade insights and analysis</CardDescription>
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
                    <strong>Premium Active:</strong> All advanced features are unlocked.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">Data-Driven Insights</h4>
                <p className="text-sm text-muted-foreground">
                  Advanced machine learning analysis of your conversation patterns, learning progression, 
                  and cognitive style. Privacy-focused with automatic data deletion.
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
                  'Unlock Advanced Analytics'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Premium Features Deep Dive */}
      <section className="container mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-4">Advanced Analytics Features</h2>
        <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
          Professional-grade analysis tools designed for developers who want comprehensive insights 
          into their learning patterns and communication data.
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
          <h2 className="text-3xl font-bold text-center mb-4">What Developers Say</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Real feedback from developers who use our advanced analytics
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

      {/* Privacy Section */}
      <section className="container mx-auto px-4 mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Privacy-First Analytics</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Your conversation data is processed securely and automatically deleted after analysis. 
            We only retain the insights, never your raw conversations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Automatic Deletion</h4>
              <p className="text-sm text-muted-foreground">
                Raw conversation files are permanently deleted within hours of processing
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Encrypted Processing</h4>
              <p className="text-sm text-muted-foreground">
                All data is encrypted in transit and at rest during analysis
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">No Data Sharing</h4>
              <p className="text-sm text-muted-foreground">
                Your data is never shared, sold, or used for training other models
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Advanced Analytics?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join developers who use data-driven insights to understand their learning patterns 
            and optimize their professional growth.
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
                Unlock Advanced Analytics - $10
              </>
            )}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;