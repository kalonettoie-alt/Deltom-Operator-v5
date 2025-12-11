import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { useLogements } from '../../hooks/useLogements';
import { usePrestataires } from '../../hooks/useProfiles';
import { Modal } from '../../components/ui/Modal';
import { Loader } from '../../components/ui/Loader';
import { InterventionForm } from '../../components/forms/InterventionForm';
import { InterventionCard } from '../../components/cards/InterventionCard';
import {
  Users,
  Building2,
  ClipboardList,
  Plus,
  Calendar,
  UserCog,
  Euro,
  TrendingUp,
} from 'lucide-react';
import type { InterventionInsert, InterventionWithRelations } from '../../types';

// Types pour les StatCards
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  bgColor: string;
  iconBgColor: string;
  iconColor: string;
  trend?: string;
}

// Composant StatCard coloré
const StatCard = ({ title, value, icon: Icon, bgColor, iconBgColor, iconColor, trend }: StatCardProps) => (
  <div className={`${bgColor} rounded-2xl p-4 md:p-5`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        )}
      </div>
      <div className={`${iconBgColor} p-3 rounded-xl`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  </div>
);

export function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { logements, isLoading: isLoadingLogements } = useLogements({ withClient: true });
  const { prestataires, isLoading: isLoadingPrestataires } = usePrestataires();

  // Stats
  const [stats, setStats] = useState({
    interventionsToday: 0,
    interventionsToAssign: 0,
    activeClients: 0,
    totalLogements: 0,
    totalPrestataires: 0,
    revenusMonth: 0,
  });
  const [upcomingInterventions, setUpcomingInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Modal d'intervention
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les statistiques
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date();
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];

        // Interventions du jour
        const { count: todayCount } = await supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);

        // Interventions à attribuer
        const { count: toAssignCount } = await supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'a_attribuer');

        // Clients actifs (ceux qui ont au moins un logement)
        const { count: clientsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client');

        // Total logements
        const { count: logementsCount } = await supabase
          .from('logements')
          .select('*', { count: 'exact', head: true });

        // Total prestataires
        const { count: prestatairesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'prestataire');

        // Revenus du mois (interventions terminées)
        const { data: revenusData } = await supabase
          .from('interventions')
          .select('prix_client_ttc')
          .eq('status', 'terminee')
          .gte('date', firstDayOfMonth)
          .lte('date', lastDayOfMonth);

        const totalRevenus = (revenusData as { prix_client_ttc: number }[] | null)?.reduce((sum, intervention) =>
          sum + (intervention.prix_client_ttc || 0), 0) || 0;

        // Interventions du jour (toutes les interventions d'aujourd'hui)
        const { data: todayInterventions } = await supabase
          .from('interventions')
          .select(`
            *,
            logement:logements(*),
            client:profiles!interventions_client_id_fkey(*),
            prestataire:profiles!interventions_prestataire_id_fkey(*)
          `)
          .eq('date', today)
          .order('status', { ascending: true });

        setStats({
          interventionsToday: todayCount || 0,
          interventionsToAssign: toAssignCount || 0,
          activeClients: clientsCount || 0,
          totalLogements: logementsCount || 0,
          totalPrestataires: prestatairesCount || 0,
          revenusMonth: totalRevenus,
        });

        setUpcomingInterventions((todayInterventions as InterventionWithRelations[]) || []);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  const handleCreateIntervention = async (data: InterventionInsert) => {
    setIsSubmitting(true);
    try {
      // Récupérer les prix du logement
      const logement = logements.find(l => l.id === data.logement_id);

      // Déterminer le statut automatiquement
      const status = data.prestataire_id ? 'assignee' : 'a_attribuer';

      const { error } = await supabase
        .from('interventions')
        .insert({
          ...data,
          status,
          prix_prestataire_ht: logement?.prix_prestataire_ht || 0,
          prix_client_ttc: logement?.prix_client_ttc || 0,
        } as never);

      if (error) {
        alert(error.message);
        return;
      }

      setIsModalOpen(false);
      // Recharger les stats
      window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formater les revenus
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Nom du mois courant
  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Bonjour, {profile?.full_name}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Voici le résumé de votre activité
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle intervention</span>
          <span className="sm:hidden">Nouvelle</span>
        </button>
      </div>

      {/* Carte Revenus du mois - Pleine largeur */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 md:p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Revenus générés</p>
            <p className="text-3xl md:text-4xl font-bold">
              {isLoadingStats ? '...' : formatCurrency(stats.revenusMonth)}
            </p>
            <p className="text-emerald-100 text-sm mt-2 capitalize">{currentMonthName}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl">
            <Euro className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Stats cards en grille 2x2 */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Logements"
          value={isLoadingStats ? '-' : stats.totalLogements}
          icon={Building2}
          bgColor="bg-blue-50"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Interventions"
          value={isLoadingStats ? '-' : stats.interventionsToday}
          icon={ClipboardList}
          bgColor="bg-sky-50"
          iconBgColor="bg-sky-100"
          iconColor="text-sky-600"
          trend="Aujourd'hui"
        />
        <StatCard
          title="Clients"
          value={isLoadingStats ? '-' : stats.activeClients}
          icon={Users}
          bgColor="bg-green-50"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Prestataires"
          value={isLoadingStats ? '-' : stats.totalPrestataires}
          icon={UserCog}
          bgColor="bg-orange-50"
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Section interventions récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Interventions du jour
          </h2>
          <button
            onClick={() => navigate('/admin/interventions')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Voir tout
          </button>
        </div>

        {isLoadingStats ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : upcomingInterventions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune intervention aujourd'hui
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingInterventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                showClient
                onClick={() => navigate(`/admin/interventions/${intervention.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de création d'intervention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle intervention"
        size="lg"
      >
        {isLoadingLogements || isLoadingPrestataires ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <InterventionForm
            logements={logements}
            prestataires={prestataires}
            onSubmit={handleCreateIntervention}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}
