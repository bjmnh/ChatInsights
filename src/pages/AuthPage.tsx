import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Brain } from 'lucide-react';

export default function AuthPage() {
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to ChatInsights
          </h1>
          <p className="text-muted-foreground">Sign in to unlock your conversation insights</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Choose your preferred way to sign in or create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <div className="flex justify-center">
                  <SignIn 
                    routing="hash"
                    redirectUrl="/dashboard"
                    appearance={{
                      elements: {
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                        card: "shadow-none border-0",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                      }
                    }}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <div className="flex justify-center">
                  <SignUp 
                    routing="hash"
                    redirectUrl="/dashboard"
                    appearance={{
                      elements: {
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                        card: "shadow-none border-0",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing up, you agree to our{' '}
          <a href="/terms" className="underline hover:text-primary">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}