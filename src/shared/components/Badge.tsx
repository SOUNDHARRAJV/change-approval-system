import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    pending: { variant: 'warning' as const, label: 'Pending' },
    under_review: { variant: 'info' as const, label: 'Under Review' },
    approved: { variant: 'success' as const, label: 'Approved' },
    rejected: { variant: 'danger' as const, label: 'Rejected' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const priorityConfig = {
    low: { variant: 'default' as const, label: 'Low' },
    medium: { variant: 'info' as const, label: 'Medium' },
    high: { variant: 'warning' as const, label: 'High' },
    critical: { variant: 'danger' as const, label: 'Critical' }
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
