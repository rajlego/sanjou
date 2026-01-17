import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { isFirebaseConfigured } from './firebaseConfig';

let auth: Auth | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const initAuth = (): Auth | null => {
  if (!isFirebaseConfigured()) {
    console.log('[Auth] Firebase not configured');
    return null;
  }

  if (auth) return auth;

  try {
    // Check if app already initialized
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('[Auth] Initialized successfully');
    return auth;
  } catch (error) {
    console.error('[Auth] Failed to initialize:', error);
    return null;
  }
};

export const getAuthInstance = (): Auth | null => auth;

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  const authInstance = initAuth();
  if (!authInstance) {
    return { success: false, error: 'Authentication not available' };
  }

  try {
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
    console.error('[Auth] Sign in error:', errorMessage);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  const authInstance = initAuth();
  if (!authInstance) {
    return { success: false, error: 'Authentication not available' };
  }

  try {
    const result = await createUserWithEmailAndPassword(authInstance, email, password);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
    console.error('[Auth] Sign up error:', errorMessage);
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const signOut = async (): Promise<AuthResult> => {
  const authInstance = initAuth();
  if (!authInstance) {
    return { success: false, error: 'Authentication not available' };
  }

  try {
    await firebaseSignOut(authInstance);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
    console.error('[Auth] Sign out error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const subscribeToAuthState = (callback: (user: User | null) => void): (() => void) => {
  const authInstance = initAuth();
  if (!authInstance) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(authInstance, callback);
};

export const getCurrentUser = (): User | null => {
  const authInstance = initAuth();
  return authInstance?.currentUser || null;
};

const getAuthErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'Authentication failed';
    }
  }
  return 'Authentication failed';
};
