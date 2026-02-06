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

  const reviewerAllowlist = ['soundharraj122005@gmail.com'];

  const isAllowedEmail = (email: string) => {
    const normalized = email.toLowerCase();
    return normalized.endsWith('@bitsathy.ac.in') || reviewerAllowlist.includes(normalized);
  };

  const deriveRoleFromEmail = (email: string): 'user' | 'reviewer' | null => {
    const normalized = email.toLowerCase();
    if (!isAllowedEmail(normalized)) return null;
    if (reviewerAllowlist.includes(normalized)) return 'reviewer';
    const hasTwoDigitsBeforeDomain = /\d{2}@bitsathy\.ac\.in$/i.test(normalized);
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

  const getStoredAdminUser = (): User | null => {
    try {
      const raw = localStorage.getItem('adminUser');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as User;
      if (!parsed || parsed.role !== 'admin' || !parsed.id) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadingGuard = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 6000);

    if (!hasSupabaseConfig) {
      const storedAdmin = getStoredAdminUser();
      if (storedAdmin) {
        setUser(storedAdmin);
      }
      setLoading(false);
      return () => {
        isMounted = false;
        clearTimeout(loadingGuard);
      };
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
          const normalizedEmail = sessionUser.email.toLowerCase();
          let role = existing?.role || derivedRole;
          if (existing?.role === 'admin') {
            role = 'admin';
          } else if (reviewerAllowlist.includes(normalizedEmail)) {
            role = 'reviewer';
          }
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
          
          // Check if user is active
          if (!dbUser.is_active) {
            setAuthError('Your account has been disabled. Please contact the administrator to restore access.');
            await supabase.auth.signOut();
            setUser(null);
            return;
          }
          
          setUser(dbUser);
        } else {
          const storedAdmin = getStoredAdminUser();
          if (storedAdmin) {
            setUser(storedAdmin);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (!hasSupabaseConfig) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
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
          const normalizedEmail = sessionUser.email.toLowerCase();
          let role = existing?.role || derivedRole;
          if (existing?.role === 'admin') {
            role = 'admin';
          } else if (reviewerAllowlist.includes(normalizedEmail)) {
            role = 'reviewer';
          }
          const fullName =
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email.split('@')[0];
          const dbUser = await upsertOAuthUser(sessionUser.email, fullName, role, sessionUser.id);
          
          // Check if user is active
          if (!dbUser.is_active) {
            setAuthError('Your account has been disabled. Please contact the administrator to restore access.');
            supabase.auth.signOut();
            setUser(null);
            return;
          }
          
          setUser(dbUser);
        } else {
          const storedAdmin = getStoredAdminUser();
          setUser(storedAdmin || null);
        }
      } catch (error) {
        console.error('Failed to sync auth state:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingGuard);
      listener.subscription.unsubscribe();
    };
  }, []);

  const loginAdmin = async (username: string, password: string) => {
    try {
      if (!hasSupabaseConfig) {
        return { success: false, error: 'Supabase is not configured.' };
      }

      const normalizedUser = username.trim().toLowerCase();
      console.log('Starting admin login for:', normalizedUser);
      
      // Get Supabase URL and key from the client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Direct REST API call to bypass hanging Supabase client
      console.log('Calling Supabase REST API directly...');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/admin_credentials?username=eq.${encodeURIComponent(normalizedUser)}&password=eq.${encodeURIComponent(password)}&select=user_id`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        console.log('REST API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error:', errorText);
          return { success: false, error: `API Error: ${response.statusText}` };
        }
        
        const credentials = await response.json();
        console.log('Credentials result:', credentials);
        
        if (!credentials || credentials.length === 0) {
          return { success: false, error: 'Invalid admin credentials.' };
        }
        
        const userId = credentials[0].user_id;
        
        // Fetch user
        const userController = new AbortController();
        const userTimeoutId = setTimeout(() => userController.abort(), 5000);
        
        const userResponse = await fetch(
          `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            signal: userController.signal
          }
        );
        
        clearTimeout(userTimeoutId);
        
        if (!userResponse.ok) {
          return { success: false, error: 'Failed to fetch user profile.' };
        }
        
        const users = await userResponse.json();
        console.log('User result:', users);
        
        if (!users || users.length === 0) {
          return { success: false, error: 'Admin profile not found.' };
        }
        
        const userData = users[0];
        
        if (!userData.is_active) {
          return { success: false, error: 'Admin account is disabled.' };
        }

        const adminUser: User = {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          is_active: userData.is_active,
          created_at: userData.created_at
        };
        
        console.log('Admin login successful:', adminUser);
        setUser(adminUser);
        try {
          localStorage.setItem('adminUser', JSON.stringify(adminUser));
        } catch {
          // Ignore storage errors; session will still be active in memory.
        }
        return { success: true };
        
      } catch (fetchErr) {
        console.error('Fetch error:', fetchErr);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          return { success: false, error: 'Request timeout. Check your internet connection.' };
        }
        return { success: false, error: fetchErr instanceof Error ? fetchErr.message : 'Network error' };
      }
      
    } catch (err) {
      console.error('Login exception:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Login failed. Please try again.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
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
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('adminUser');
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
