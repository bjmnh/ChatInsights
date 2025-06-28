import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerkAuth();
  const [loading, setLoading] = useState(true);

  // Sync Clerk user with Supabase
  useEffect(() => {
    const syncUserWithSupabase = async () => {
      if (!isLoaded) return;
      
      if (clerkUser) {
        try {
          // Check if user exists in Supabase
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', clerkUser.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchError);
            return;
          }

          // Create or update user in Supabase
          const userData = {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || '',
            avatar_url: clerkUser.imageUrl || null,
            updated_at: new Date().toISOString(),
          };

          if (!existingUser) {
            // Create new user
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                ...userData,
                created_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error('Error creating user:', insertError);
            }
          } else {
            // Update existing user
            const { error: updateError } = await supabase
              .from('users')
              .update(userData)
              .eq('id', clerkUser.id);

            if (updateError) {
              console.error('Error updating user:', updateError);
            }
          }
        } catch (error) {
          console.error('Error syncing user with Supabase:', error);
        }
      }
      
      setLoading(false);
    };

    syncUserWithSupabase();
  }, [clerkUser, isLoaded]);

  const logout = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out!');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  // Transform Clerk user to match the expected format
  const transformedUser = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    user_metadata: {
      name: clerkUser.fullName || clerkUser.firstName || '',
      avatar_url: clerkUser.imageUrl || null,
    }
  } : null;

  const value = {
    user: transformedUser,
    loading: loading || !isLoaded,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};