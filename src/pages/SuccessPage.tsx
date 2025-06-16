import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { StripeService } from '../services/stripeService';
import { getProductByPriceId } from '../stripe-config';
import { toast } from 'sonner';

const SuccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!sessionId) {
      navigate('/pricing');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch updated subscription and order data
        const [subscriptionData, ordersData] = await Promise.all([
          StripeService.getUserSubscription(),
          StripeService.getUserOrders(),
        ]);

        setSubscription(subscriptionData);
        setOrders(ordersData);
        
        toast.success('Payment successful! Welcome to Premium!');
      } catch (error) {
        console.error('Error fetching payment data:', error);
        toast.error('Payment completed, but there was an issue loading your data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, sessionId, navigate]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleViewAnalysis = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = StripeService.hasActiveSubscription(subscription);
  const latestOrder = orders[0];
  const purchasedProduct = latestOrder ? getProductByPriceId(latestOrder.price_id) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="h-5 w-5 mr-2 text-yellow-500" />
              Welcome to Premium!
            </CardTitle>
            <CardDescription>
              You now have access to all premium features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hasActiveSubscription && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Subscription Active:</strong> Your premium subscription is now active and will renew automatically.
                  </AlertDescription>
                </Alert>
              )}

              {latestOrder && (
                <Alert className="border-blue-200 bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Purchase Complete:</strong> You've successfully purchased {purchasedProduct?.name || 'Premium Access'} for ${(latestOrder.amount_total / 100).toFixed(2)}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">What's included in your premium access:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>The Digital Mirror:</strong> AI personality profiling</li>
                  <li>• <strong>Hidden Patterns:</strong> Unconscious theme discovery</li>
                  <li>• <strong>The Revelation Map:</strong> Cross-conversation connections</li>
                  <li>• Unlimited conversation analyses</li>
                  <li>• Advanced behavioral insights</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleViewAnalysis} className="flex-1">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start New Analysis
                </Button>
                <Button variant="outline" onClick={handleContinue} className="flex-1">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {sessionId && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Session ID: {sessionId}</p>
            <p className="mt-2">
              If you have any questions, please contact support at{' '}
              <a href="mailto:support@chatinsights.com" className="text-primary hover:underline">
                support@chatinsights.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessPage;