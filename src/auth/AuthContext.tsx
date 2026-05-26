import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { api, ApiError, type RestaurantProfile } from '../api';

type AuthPhase = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  phase: AuthPhase;
  user: User | null;
  restaurantId: string | null;
  restaurant: RestaurantProfile | null;
  /** Last surfaced auth-flow error message; cleared on the next attempt. */
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, accessCode: string): Promise<void>;
  signOut(message?: string): Promise<void>;
  clearError(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function describeFirebaseError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code: string }).code);
    switch (code) {
      case 'auth/invalid-email':            return 'Invalid email address.';
      case 'auth/user-disabled':            return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':       return 'Email or password is incorrect.';
      case 'auth/email-already-in-use':     return 'An account with that email already exists.';
      case 'auth/weak-password':            return 'Password must be at least 6 characters.';
      case 'auth/network-request-failed':   return 'Network error — check your connection.';
      case 'auth/too-many-requests':        return 'Too many attempts. Try again in a few minutes.';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Skip resolving the session for a single Firebase auth-state change — used
  // right after sign-up so we can run `register()` before `session()` would
  // otherwise 404.
  const skipNextResolve = useRef(false);

  const resolveSession = useCallback(async (current: User) => {
    try {
      const res = await api.auth.session();
      setRestaurantId(res.restaurantId);
      setRestaurant(res.restaurant);
      setPhase('signed-in');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === 'restaurant_not_found')) {
        await firebaseSignOut(auth);
        setRestaurantId(null);
        setRestaurant(null);
        setUser(null);
        setPhase('signed-out');
        setError('Your account is not linked to a restaurant. Sign in again or contact your administrator.');
        return;
      }
      // Any other failure: stay signed out and surface the error.
      await firebaseSignOut(auth);
      setRestaurantId(null);
      setRestaurant(null);
      setUser(null);
      setPhase('signed-out');
      setError(err instanceof Error ? err.message : 'Could not load your account.');
    }
    void current;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setRestaurantId(null);
        setRestaurant(null);
        setPhase('signed-out');
        return;
      }
      if (skipNextResolve.current) {
        skipNextResolve.current = false;
        return;
      }
      setPhase('loading');
      await resolveSession(nextUser);
    });
    return () => unsub();
  }, [resolveSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setPhase('loading');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged will run resolveSession.
    } catch (err) {
      setPhase('signed-out');
      setError(describeFirebaseError(err, 'Sign in failed.'));
      throw err;
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, accessCode: string) => {
      setError(null);
      setPhase('loading');

      // Validate the access code before creating any Firebase user — avoids
      // leaving an orphaned account if the code is wrong.
      try {
        const check = await api.auth.validateAccessCode({ accessCode });
        if (!check.valid) {
          setPhase('signed-out');
          setError('That access code is not valid. Double-check it with your administrator.');
          throw new Error('invalid_access_code');
        }
      } catch (err) {
        setPhase('signed-out');
        if (err instanceof ApiError) setError(err.message);
        else if (!(err instanceof Error && err.message === 'invalid_access_code')) {
          setError('Could not validate the access code. Try again.');
        }
        throw err;
      }

      // Create the Firebase account.
      skipNextResolve.current = true; // we'll register before session()
      let created: User;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        created = cred.user;
      } catch (err) {
        skipNextResolve.current = false;
        setPhase('signed-out');
        setError(describeFirebaseError(err, 'Could not create the account.'));
        throw err;
      }

      // Bind the new user to a restaurant on the server.
      try {
        const res = await api.auth.register({ accessCode });
        setRestaurantId(res.restaurantId);
        setRestaurant(res.restaurant);
        setUser(created);
        setPhase('signed-in');
      } catch (err) {
        // Server rejected the binding (already-used code, race, etc).
        // Delete the just-created Firebase user so they can try again.
        try { await deleteUser(created); } catch { /* ignore */ }
        try { await firebaseSignOut(auth); } catch { /* ignore */ }
        setRestaurantId(null);
        setRestaurant(null);
        setUser(null);
        setPhase('signed-out');
        if (err instanceof ApiError) setError(err.message);
        else setError('Could not link the account to a restaurant. Try again.');
        throw err;
      }
    },
    [],
  );

  const signOut = useCallback(async (message?: string) => {
    await firebaseSignOut(auth);
    setRestaurantId(null);
    setRestaurant(null);
    setUser(null);
    setPhase('signed-out');
    setError(message ?? null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      user,
      restaurantId,
      restaurant,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [phase, user, restaurantId, restaurant, error, signIn, signUp, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
