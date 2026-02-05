import { User, UserCheck, Shield } from 'lucide-react';

interface LandingProps {
  onRoleSelect: (role: 'user' | 'reviewer' | 'admin') => void;
}

export const Landing = ({ onRoleSelect }: LandingProps) => {
  const roles = [
    {
      id: 'user',
      name: 'User',
      icon: User,
      description: 'Submit and track change requests',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      id: 'reviewer',
      name: 'Reviewer',
      icon: UserCheck,
      description: 'Review and approve change requests',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl shadow-lg mb-6">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-8">
            Change Approval System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Streamline your change management process with our comprehensive approval system.
            Submit, review, and track changes efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onRoleSelect(role.id as 'user' | 'reviewer')}
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left overflow-hidden animate-in fade-in slide-in-from-bottom duration-700`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${role.color} ${role.hoverColor} transition-all duration-300 mb-4 group-hover:scale-110`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {role.name}
                  </h3>
                  <p className="text-gray-600">
                    {role.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    Continue as {role.name}
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '300ms' }}>
          <button
            onClick={() => onRoleSelect('admin')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-700 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
          >
            <Shield className="w-5 h-5" />
            <span>Admin Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
