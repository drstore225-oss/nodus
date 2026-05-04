import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import {
  LogOut,
  LayoutDashboard,
  Ticket,
  Building2,
  Users,
  UsersRound,
  Settings,
  Menu,
  X,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chamados', label: 'Chamados', icon: Ticket },
  { to: '/institucoes', label: 'Instituições', icon: Building2, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/equipes', label: 'Equipes', icon: UsersRound, roles: ['SUPERADMIN', 'ADMIN', 'GESTOR'] },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['SUPERADMIN', 'ADMIN'] },
  { to: '/centros-custo', label: 'Centros de Custo', icon: Layers, roles: ['SUPERADMIN', 'ADMIN', 'GESTOR'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

const roleColors: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  GESTOR: 'bg-cyan-100 text-cyan-700',
  TECNICO: 'bg-emerald-100 text-emerald-700',
  SOLICITANTE: 'bg-slate-100 text-slate-700',
};

export const DashboardLayout: React.FC = () => {
  const { signOut, profile, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile?.role || '')
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">Nodus</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 mb-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <span className={`inline-block mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${roleColors[profile?.role || ''] || 'bg-slate-100 text-slate-600'}`}>
              {profile?.role || '...'}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-white h-full shadow-xl z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-800">Nodus</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
