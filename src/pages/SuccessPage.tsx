import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CheckCircle, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { StripeService } from '../services/stripeService';
import { toast } from 'sonner';

const SuccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [orders, setOrders] = useState<Array<{
    checkout_session_id: string;
    payment_status: string;
    order_status: string;
    amount_total: number;
  }>>([]);
  const [retryCount, setRetryCount] = useState(0);

  const sessionId = searchParams.get('session_id');
  const maxRetries = 5; // Maximum number of retries for checking payment status
  const retryDelay = 2000; // 2 seconds between retries

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!sessionId) {
      navigate('/pricing');
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        // First, check if we already have premium access
        const hasPremium = await StripeService.checkPremiumAccess();
        if (hasPremium) {
          setIsPremium(true);
          setLoading(false);
          toast.success('Premium access activated!');
          return true;
        }

        // If we've reached max retries, stop trying
        if (retryCount >= maxRetries) {
          setError('Payment processing is taking longer than expected. Your premium access will be activated shortly.');
          setLoading(false);
          return false;
        }

        // Fetch latest orders to check for the current session
        const ordersData = await StripeService.getUserOrders();
        setOrders(ordersData);

        // Check if the current session is in the orders
        const currentOrder = ordersData.find(order => 
          order.checkout_session_id === sessionId && 
          order.payment_status === 'paid' && 
          order.order_status === 'completed'
        );

        if (currentOrder) {
          // Update premium status in the UI
          setIsPremium(true);
          setLoading(false);
          toast.success('Payment successful! Welcome to Premium!');
          return true;
        }

        // If not found, retry after a delay
        setRetryCount(prev => prev + 1);
        setTimeout(checkPaymentStatus, retryDelay);
        
      } catch (error) {
        console.error('Error checking payment status:', error);
        setError('Failed to verify payment status. Please refresh the page or contact support.');
        setLoading(false);
        return false;
      }
    };

    // Initial check
    checkPaymentStatus();
  }, [user, sessionId, navigate, retryCount]);

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
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-2xl font-semibold">Processing your payment...</h2>
          <p className="text-muted-foreground">
            This may take a few moments. Please don't close this page.
            {retryCount > 0 && ` (Attempt ${retryCount} of ${maxRetries})`}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-4 p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Payment Processing Issue</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const latestOrder = orders[0];
  const hasActiveSubscription = latestOrder && 
    latestOrder.payment_status === 'paid' && 
    latestOrder.order_status === 'completed';

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
              {isPremium ? 'Welcome to Premium!' : 'Premium Access'}
            </CardTitle>
            <CardDescription>
              {isPremium 
                ? 'You now have access to all premium features!'
                : 'Verifying your premium access...'}
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
                    <strong>Purchase Complete:</strong> You've successfully purchased premium access for ${(latestOrder.amount_total / 100).toFixed(2)}.
                  </AlertDescription>
                </Alert>
              )}

              {isPremium && (
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
              )}

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