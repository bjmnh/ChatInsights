import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getAuthErrorMessage = (error: AuthError | Error): string => {
  if ('code' in error) {
    switch (error.code) {
      case 'email_address_invalid':
        return 'Please enter a valid email address. If you believe this email is valid, please contact support.';
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'email_not_confirmed':
        return 'Please check your email and click the confirmation link before signing in.';
      case 'signup_disabled':
        return 'New user registration is currently disabled. Please contact support.';
      case 'email_address_not_authorized':
        return 'This email address is not authorized to sign up. Please contact support.';
      case 'weak_password':
        return 'Password is too weak. Please choose a stronger password with at least 8 characters.';
      case 'user_already_exists':
        return 'An account with this email already exists. Please try signing in instead.';
      case 'too_many_requests':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'provider_email_needs_verification':
        return 'Please verify your email address with your OAuth provider and try again.';
      case 'oauth_provider_not_supported':
        return 'This OAuth provider is not supported. Please try a different sign-in method.';
      default:
        return error.message || 'An authentication error occurred. Please try again.';
    }
  }
  return error.message || 'An unexpected error occurred. Please try again.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        toast.success('Successfully signed in!');
      } else if (event === 'SIGNED_OUT') {
        toast.success('Successfully signed out!');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Login failed - no user data received');
      }

    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      
      // Validate email format on client side first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name?.trim() || '',
          },
          emailRedirectTo: config.getRedirectUrl('/auth/confirm'),
        },
      });

      if (error) {
        throw error;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast.success('Registration successful! Please check your email for a confirmation link.');
        return;
      }

      if (!data.user) {
        throw new Error('Registration failed - no user data received');
      }

    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: config.getRedirectUrl('/dashboard'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    }
  };

  const loginWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: config.getRedirectUrl('/dashboard'),
        },
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: config.getRedirectUrl('/auth/reset-password'),
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      toast.error(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};