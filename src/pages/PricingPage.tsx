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
  Star,
  Target,
  Search,
  Layers,
  Eye
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
      'Advanced cognitive pattern analysis',
      'Learning progression tracking',
      'Skill development insights',
      'Problem-solving methodology analysis',
      'Knowledge gap identification',
      'Cross-conversation pattern recognition',
      'Behavioral trend analysis',
      'Custom deep-dive reports',
      'Priority support',
      'Data export capabilities'
    ]
  };

  const premiumFeatures = [
    {
      icon: <Target className="h-6 w-6" />,
      name: "Cognitive Pattern Analysis",
      description: "Advanced algorithms identify your unique problem-solving approaches, thinking patterns, and decision-making styles from conversation data.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      name: "Learning Progression Tracking",
      description: "Track skill development, knowledge acquisition patterns, and learning velocity using data science techniques.",
    },
    {
      icon: <Network className="h-6 w-6" />,
      name: "Cross-Conversation Insights",
      description: "Discover connections and themes that span across your entire conversation history to reveal long-term patterns.",
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Senior Software Engineer",
      content: "The cognitive analysis identified patterns in my problem-solving approach that I never consciously recognized. It's like having a data scientist analyze your thinking process.",
      plan: "Advanced Analytics"
    },
    {
      name: "Sarah Kim",
      role: "Data Scientist",
      content: "The learning progression analysis helped me understand my skill development velocity and identify knowledge gaps I wasn't aware of.",
      plan: "Advanced Analytics"
    },
    {
      name: "Marcus Rodriguez",
      role: "Tech Lead",
      content: "The cross-conversation insights revealed consistent patterns in how I approach technical discussions. Incredibly valuable for self-awareness.",
      plan: "Advanced Analytics"
    }
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-16">
        <Badge variant="secondary" className="mb-6">
          <Database className="h-3 w-3 mr-1" />
          Professional Analytics Platform
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold mb-6">
          Advanced Conversation Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Professional-grade analysis tools for developers who want data-driven insights 
          into their communication patterns and cognitive approaches
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2 border-muted">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Basic Analytics</CardTitle>
                  <CardDescription>Essential conversation insights</CardDescription>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
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
          <Card className="relative border-2 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="px-3 py-1 bg-primary">
                <Zap className="h-3 w-3 mr-1" />
                Advanced Analytics
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Advanced Analytics</CardTitle>
                  <CardDescription>Professional-grade insights and analysis</CardDescription>
                </div>
                <Target className="h-8 w-8 text-primary" />
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
                  <Target className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Advanced Analytics Active:</strong> All premium features are unlocked.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">Deep Data Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Advanced machine learning analysis of your conversation patterns, cognitive styles, 
                  and learning progressions. Privacy-focused with automatic data deletion.
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
          into their communication patterns and cognitive approaches.
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

      {/* What You'll Discover Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">What You'll Discover</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Advanced analytics reveal insights about your digital communication that you never knew existed
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <Search className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Problem-Solving Patterns</h4>
              <p className="text-sm text-muted-foreground">
                How you approach technical challenges and break down complex problems
              </p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Learning Velocity</h4>
              <p className="text-sm text-muted-foreground">
                Your skill acquisition rate and knowledge progression over time
              </p>
            </div>
            <div className="text-center">
              <Network className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Cognitive Connections</h4>
              <p className="text-sm text-muted-foreground">
                How you link concepts and build understanding across topics
              </p>
            </div>
            <div className="text-center">
              <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Communication Style</h4>
              <p className="text-sm text-muted-foreground">
                Your unique approach to technical discussions and knowledge sharing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Developer Insights</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Real feedback from developers who've discovered their data story
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Target className="h-4 w-4 text-primary mr-2" />
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
            We retain only the insights—never your raw conversations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-muted/50 rounded-lg border border-muted">
              <h4 className="font-semibold mb-2">Automatic Data Deletion</h4>
              <p className="text-sm text-muted-foreground">
                Raw conversation files are permanently deleted within hours of processing
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-muted">
              <h4 className="font-semibold mb-2">Encrypted Processing</h4>
              <p className="text-sm text-muted-foreground">
                All data is encrypted in transit and at rest during analysis
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-muted">
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
            Join developers who use data-driven insights to understand their communication patterns 
            and optimize their learning approach.
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
                <Target className="mr-2 h-5 w-5" />
                You Have Advanced Analytics!
              </>
            ) : !user ? (
              'Sign In to Purchase'
            ) : (
              <>
                <Target className="mr-2 h-5 w-5" />
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