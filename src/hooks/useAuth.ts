import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  signIn,
  signUp,
  signOut,
  subscribeToAuthState,
  getCurrentUser,
  initAuth,
} from '../sync/firebaseAuth';
import { isFirebaseConfigured } from '../sync/firebaseConfig';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthAvailable: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const isAuthAvailable = isFirebaseConfigured();

  useEffect(() => {
    if (!isAuthAvailable) {
      setIsLoading(false);
      return;
    }

    // Initialize auth
    initAuth();

    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isAuthAvailable]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);
    return { success: result.success, error: result.error };
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const result = await signUp(email, password);
    setIsLoading(false);
    return { success: result.success, error: result.error };
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    const result = await signOut();
    setIsLoading(false);
    return { success: result.success, error: result.error };
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    isAuthAvailable,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
};
