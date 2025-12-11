import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../hooks/useAuth';
import {
  X,
  Home,
  Building2,
  ClipboardList,
  Calendar,
  Users,
  UserCog,
  Briefcase,
  LogOut,
} from 'lucide-react';

// Items de navigation par rôle pour le drawer mobile
const adminNavItems = [
  { to: '/admin', icon: Home, label: 'Dashboard' },
  { to: '/admin/logements', icon: Building2, label: 'Logements' },
  { to: '/admin/interventions', icon: ClipboardList, label: 'Interventions' },
  { to: '/admin/calendrier', icon: Calendar, label: 'Calendrier' },
  { to: '/admin/clients', icon: Users, label: 'Clients' },
  { to: '/admin/prestataires', icon: UserCog, label: 'Prestataires' },
];

const clientNavItems = [
  { to: '/client', icon: Home, label: 'Dashboard' },
  { to: '/client/logements', icon: Building2, label: 'Mes logements' },
  { to: '/client/interventions', icon: ClipboardList, label: 'Interventions' },
];

const prestataireNavItems = [
  { to: '/prestataire', icon: Home, label: 'Dashboard' },
  { to: '/prestataire/missions', icon: Briefcase, label: 'Mes missions' },
  { to: '/prestataire/planning', icon: Calendar, label: 'Planning' },
];

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sélectionner les items de navigation selon le rôle
  const getNavItems = () => {
    if (profile?.role === 'admin') return adminNavItems;
    if (profile?.role === 'client') return clientNavItems;
    if (profile?.role === 'prestataire') return prestataireNavItems;
    return [];
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Header mobile */}
      <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Contenu principal */}
      <main className="lg:pl-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Navigation mobile */}
      <BottomNav />

      {/* Drawer menu mobile */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl lg:hidden transform transition-transform animate-slide-in-right">
            {/* Header du drawer */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {profile && (
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to ||
                  (item.to !== '/admin' && item.to !== '/client' && item.to !== '/prestataire' &&
                   location.pathname.startsWith(item.to));

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Séparateur */}
            <div className="border-t border-gray-200 mx-4" />

            {/* Bouton déconnexion en bas */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Se déconnecter</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Animation CSS pour le drawer */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
