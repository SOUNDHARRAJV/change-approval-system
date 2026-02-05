import { useEffect } from 'react';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/UserDashboard';
import { ReviewerDashboard } from './pages/ReviewerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Keep for future side effects if needed
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    switch (user.role) {
      case 'user':
        return <UserDashboard />;
      case 'reviewer':
        return <ReviewerDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Login />;
    }
  }

  return <Login />;
}

export default App;
