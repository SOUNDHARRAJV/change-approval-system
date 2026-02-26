import { useAuth } from '../contexts/AuthContext';
import { Login } from '../features/auth/pages/Login';
import { UserDashboard } from '../features/approvals/pages/UserDashboard';
import { ReviewerDashboard } from '../features/approvals/pages/ReviewerDashboard';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';

/**
 * Role-based routing component.
 * Renders the correct page based on the authenticated user's role.
 */
export const AppRoutes = () => {
    const { user } = useAuth();

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
};
