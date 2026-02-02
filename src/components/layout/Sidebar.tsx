import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import {
  Home,
  Users,
  Building2,
  Calendar,
  ClipboardList,
  LogOut,
  Briefcase,
  UserCog,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { to: '/admin/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
  { to: '/admin/prestataires', label: 'Prestataires', icon: <UserCog className="w-5 h-5" /> },
  { to: '/admin/logements', label: 'Logements', icon: <Building2 className="w-5 h-5" /> },
  { to: '/admin/interventions', label: 'Interventions', icon: <ClipboardList className="w-5 h-5" /> },
  { to: '/admin/calendrier', label: 'Calendrier', icon: <Calendar className="w-5 h-5" /> },
  { to: '/admin/historique', label: 'Historique', icon: <BarChart3 className="w-5 h-5" /> },
];

const clientNavItems: NavItem[] = [
  { to: '/client', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { to: '/client/logements', label: 'Mes logements', icon: <Building2 className="w-5 h-5" /> },
  { to: '/client/interventions', label: 'Interventions', icon: <ClipboardList className="w-5 h-5" /> },
];

const prestataireNavItems: NavItem[] = [
  { to: '/prestataire', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { to: '/prestataire/missions', label: 'Mes missions', icon: <Briefcase className="w-5 h-5" /> },
  { to: '/prestataire/planning', label: 'Planning', icon: <Calendar className="w-5 h-5" /> },
  { to: '/prestataire/historique', label: 'Historique', icon: <BarChart3 className="w-5 h-5" /> },
];

const navItemsByRole: Record<UserRole, NavItem[]> = {
  admin: adminNavItems,
  client: clientNavItems,
  prestataire: prestataireNavItems,
};

export function Sidebar() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const navItems = navItemsByRole[profile.role];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">Deltom Operator</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/client' || item.to === '/prestataire'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Profil et déconnexion */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
