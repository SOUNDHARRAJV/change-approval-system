import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { User, getUserByEmail, getUserById, upsertOAuthUser } from '../lib/data';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string;
  loginAdmin: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const isAllowedEmail = (email: string) => email.toLowerCase().endsWith('@bitsathy.ac.in');

  const deriveRoleFromEmail = (email: string): 'user' | 'reviewer' | null => {
    if (!isAllowedEmail(email)) return null;
    const hasTwoDigitsBeforeDomain = /\d{2}@bitsathy\.ac\.in$/i.test(email);
    return hasTwoDigitsBeforeDomain ? 'user' : 'reviewer';
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => resolve(fallback), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>
        );
        const sessionUser = data.session?.user;
        if (sessionUser?.email) {
          const derivedRole = deriveRoleFromEmail(sessionUser.email);
          if (!derivedRole) {
            setAuthError('Only bitsathy.ac.in emails are allowed.');
            await supabase.auth.signOut();
            setUser(null);
            return;
          }
          const existing = await withTimeout(getUserByEmail(sessionUser.email), 4000, null);
          const role = existing?.role || derivedRole;
          const fullName =
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email.split('@')[0];
          const dbUser = await withTimeout(
            upsertOAuthUser(sessionUser.email, fullName, role, sessionUser.id),
            4000,
            {
              id: sessionUser.id,
              email: sessionUser.email,
              full_name: fullName,
              role,
              is_active: true,
              created_at: new Date().toISOString()
            }
          );
          setUser(dbUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!hasSupabaseConfig) {
        setUser(null);
        return;
      }
      const sessionUser = session?.user;
      if (sessionUser?.email) {
        const derivedRole = deriveRoleFromEmail(sessionUser.email);
        if (!derivedRole) {
          setAuthError('Only bitsathy.ac.in emails are allowed.');
          supabase.auth.signOut();
          setUser(null);
          return;
        }
        const existing = await getUserByEmail(sessionUser.email);
        const role = existing?.role || derivedRole;
        const fullName =
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.email.split('@')[0];
        const dbUser = await upsertOAuthUser(sessionUser.email, fullName, role, sessionUser.id);
        setUser(dbUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const loginAdmin = async (username: string, password: string) => {
    setLoading(true);
    try {
      if (!hasSupabaseConfig) {
        return { success: false, error: 'Supabase is not configured.' };
      }

      const normalizedUser = username.trim().toLowerCase();
      const { data, error } = await supabase
        .from('admin_credentials')
        .select('user_id')
        .eq('username', normalizedUser)
        .eq('password', password)
        .single();

      if (error || !data?.user_id) {
        return { success: false, error: 'Invalid admin credentials.' };
      }

      const adminUser = await getUserById(data.user_id);
      if (!adminUser) {
        return { success: false, error: 'Admin profile not found.' };
      }
      if (!adminUser.is_active) {
        return { success: false, error: 'Admin account is disabled.' };
      }

      setUser(adminUser);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      if (!hasSupabaseConfig) {
        return { success: false, error: 'Supabase is not configured.' };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Google sign-in failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    supabase.auth.signOut();
  };

  const clearAuthError = () => setAuthError('');

  return (
    <AuthContext.Provider value={{ user, loading, authError, loginAdmin, loginWithGoogle, logout, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
