import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import {
  Home,
  ClipboardList,
  Calendar,
  Briefcase,
  BarChart3,
  UserCog,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Accueil', icon: <Home className="w-5 h-5" /> },
  { to: '/admin/interventions', label: 'Missions', icon: <ClipboardList className="w-5 h-5" /> },
  { to: '/admin/calendrier', label: 'Calendrier', icon: <Calendar className="w-5 h-5" /> },
  { to: '/admin/prestataires', label: 'Prestataires', icon: <UserCog className="w-5 h-5" /> },
  { to: '/admin/historique', label: 'Historique', icon: <BarChart3 className="w-5 h-5" /> },
];

const clientNavItems: NavItem[] = [
  { to: '/client', label: 'Accueil', icon: <Home className="w-5 h-5" /> },
  { to: '/client/interventions', label: 'Missions', icon: <ClipboardList className="w-5 h-5" /> },
  { to: '/client/calendrier', label: 'Calendrier', icon: <Calendar className="w-5 h-5" /> },
  { to: '/client/historique', label: 'Historique', icon: <BarChart3 className="w-5 h-5" /> },
];

const prestataireNavItems: NavItem[] = [
  { to: '/prestataire', label: 'Accueil', icon: <Home className="w-5 h-5" /> },
  { to: '/prestataire/missions', label: 'Missions', icon: <Briefcase className="w-5 h-5" /> },
  { to: '/prestataire/planning', label: 'Planning', icon: <Calendar className="w-5 h-5" /> },
  { to: '/prestataire/historique', label: 'Historique', icon: <BarChart3 className="w-5 h-5" /> },
];

const navItemsByRole: Record<UserRole, NavItem[]> = {
  admin: adminNavItems,
  client: clientNavItems,
  prestataire: prestataireNavItems,
};

export function BottomNav() {
  const { profile } = useAuth();

  if (!profile) return null;

  const navItems = navItemsByRole[profile.role];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/client' || item.to === '/prestataire'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
