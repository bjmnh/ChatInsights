import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, CheckCircle, XCircle, Brain } from 'lucide-react';
import { toast } from 'sonner';

const EmailConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (!accessToken || !refreshToken) {
          throw new Error('Invalid confirmation link. Please try signing up again.');
        }

        if (type === 'signup') {
          // Set the session with the tokens from the email
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Your email has been confirmed successfully! You are now signed in.');
            toast.success('Email confirmed successfully!');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            throw new Error('Failed to confirm email. Please try again.');
          }
        } else {
          throw new Error('Invalid confirmation type.');
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to confirm email. Please try again.');
        toast.error('Email confirmation failed');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  const handleReturnToAuth = () => {
    navigate('/auth');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Email Confirmation</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin mr-2" />}
              {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500 mr-2" />}
              {status === 'error' && <XCircle className="h-6 w-6 text-red-500 mr-2" />}
              {status === 'loading' && 'Confirming Email...'}
              {status === 'success' && 'Email Confirmed!'}
              {status === 'error' && 'Confirmation Failed'}
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'loading' && 'Please wait while we confirm your email address.'}
              {status === 'success' && 'Welcome to ChatInsights! Your account is now active.'}
              {status === 'error' && 'There was a problem confirming your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className={`mb-4 ${status === 'success' ? 'border-green-200 bg-green-50' : status === 'error' ? 'border-red-200 bg-red-50' : ''}`}>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              {status === 'success' && (
                <Button onClick={handleGoToDashboard} className="w-full">
                  Go to Dashboard
                </Button>
              )}
              {status === 'error' && (
                <Button onClick={handleReturnToAuth} className="w-full">
                  Return to Sign Up
                </Button>
              )}
              {status === 'loading' && (
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {status === 'error' && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              If you continue to have problems, please contact support at{' '}
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

export default EmailConfirmationPage;