import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { FullPageLoader } from './components/ui/Loader';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';

// Pages Admin
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminLogements } from './pages/admin/Logements';
import { AdminClients } from './pages/admin/Clients';
import { AdminPrestataires } from './pages/admin/Prestataires';
import { AdminInterventions } from './pages/admin/Interventions';
import { AdminInterventionDetail } from './pages/admin/InterventionDetail';
import { AdminCalendar } from './pages/admin/Calendar';
import { AdminHistorique } from './pages/admin/Historique';

// Pages Client
import { ClientDashboard } from './pages/client/Dashboard';
import { ClientLogements } from './pages/client/Logements';
import { ClientInterventions } from './pages/client/Interventions';
import { ClientCalendar } from './pages/client/Calendar';
import { ClientHistorique } from './pages/client/Historique';

// Pages Prestataire
import { ProviderDashboard } from './pages/provider/Dashboard';
import { ProviderMissions } from './pages/provider/Missions';
import { ProviderMissionDetail } from './pages/provider/MissionDetail';
import { ProviderPlanning } from './pages/provider/Planning';
import { ProviderHistorique } from './pages/provider/Historique';

import type { UserRole } from './types';
import type { ReactNode } from 'react';

// Composant pour protéger les routes par rôle
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    // Rediriger vers le dashboard approprié
    const redirectPath = profile.role === 'admin'
      ? '/admin'
      : profile.role === 'client'
        ? '/client'
        : '/prestataire';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

// Composant pour la redirection initiale selon le rôle
function RoleBasedRedirect() {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  switch (profile.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'client':
      return <Navigate to="/client" replace />;
    case 'prestataire':
      return <Navigate to="/prestataire" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  const { user, profile, isLoading } = useAuth();

  // Afficher le loader pendant le chargement initial
  if (isLoading) {
    return <FullPageLoader />;
  }

  // Si non authentifié, afficher la page de login
  if (!user || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Redirection racine */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* Routes Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="prestataires" element={<AdminPrestataires />} />
        <Route path="logements" element={<AdminLogements />} />
        <Route path="interventions" element={<AdminInterventions />} />
        <Route path="interventions/:id" element={<AdminInterventionDetail />} />
        <Route path="calendrier" element={<AdminCalendar />} />
        <Route path="historique" element={<AdminHistorique />} />
      </Route>

      {/* Routes Client */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="logements" element={<ClientLogements />} />
        <Route path="interventions" element={<ClientInterventions />} />
        <Route path="calendrier" element={<ClientCalendar />} />
        <Route path="historique" element={<ClientHistorique />} />
      </Route>

      {/* Routes Prestataire */}
      <Route
        path="/prestataire"
        element={
          <ProtectedRoute allowedRoles={['prestataire']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboard />} />
        <Route path="missions" element={<ProviderMissions />} />
        <Route path="missions/:id" element={<ProviderMissionDetail />} />
        <Route path="planning" element={<ProviderPlanning />} />
        <Route path="historique" element={<ProviderHistorique />} />
      </Route>

      {/* Login pour les utilisateurs déjà connectés */}
      <Route path="/login" element={<RoleBasedRedirect />} />

      {/* 404 - Rediriger vers le dashboard */}
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}

export default App;
