import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { checkSupabaseConnection } from '../lib/supabase';
import { useToast } from '../components/Toast';

export const Login = () => {
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [authModalMessage, setAuthModalMessage] = useState('');
  const { authError, clearAuthError, loginAdmin, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (authError) {
      setAuthModalMessage(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  useEffect(() => {
    let isActive = true;
    checkSupabaseConnection()
      .then((result) => {
        if (!isActive) return;
        setConnectionError(result.ok ? '' : result.message || 'Supabase is unreachable.');
      })
      .catch(() => {
        if (!isActive) return;
        setConnectionError('Supabase is unreachable.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await loginAdmin(username, password);
    setLoading(false);

    if (result.success) {
      showToast('Login successful!', 'success');
    } else {
      setError(result.error || 'Login failed');
      showToast(result.error || 'Login failed', 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error || 'Google sign-in failed');
      showToast(result.error || 'Google sign-in failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom duration-500">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Hi, Welcome Back!
            </h2>
            <p className="text-gray-600">
              Sign in to access your dashboard
            </p>
          </div>

          {connectionError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {connectionError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={error && !username ? 'Username is required' : ''}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error && !password ? 'Password is required' : ''}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              {loading ? 'Signing in...' : 'Login'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>
        </div>
      </div>

      <Modal
        isOpen={!!authModalMessage}
        onClose={() => setAuthModalMessage('')}
        title="Account Access Restricted"
        size="sm"
      >
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 leading-relaxed text-center">
            <p>Your account has been disabled. Please contact the administrator to restore access.</p>
            <p className="mt-2">
              For help, email <span className="font-semibold text-red-700">admin@changeapprovalsystem.ac.in</span>.
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={() => setAuthModalMessage('')}>
              Okay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
