import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../shared/components/Toast';

interface ProvidersProps {
    children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
    return (
        <AuthProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </AuthProvider>
    );
};
