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
import { LayoutDashboard, Users, Building2, ClipboardList, Plus, Calendar } from 'lucide-react';
import type { InterventionInsert, InterventionWithRelations } from '../../types';

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

        // Interventions à venir (aujourd'hui et après, pas terminées)
        const { data: upcoming } = await supabase
          .from('interventions')
          .select(`
            *,
            logement:logements(*),
            client:profiles!interventions_client_id_fkey(*),
            prestataire:profiles!interventions_prestataire_id_fkey(*)
          `)
          .gte('date', today)
          .neq('status', 'terminee')
          .order('date', { ascending: true })
          .limit(5);

        setStats({
          interventionsToday: todayCount || 0,
          interventionsToAssign: toAssignCount || 0,
          activeClients: clientsCount || 0,
          totalLogements: logementsCount || 0,
        });

        setUpcomingInterventions((upcoming as InterventionWithRelations[]) || []);
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {profile?.full_name}
          </h1>
          <p className="text-gray-600 mt-1">
            Bienvenue sur votre tableau de bord administrateur
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle intervention
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Interventions aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingStats ? '-' : stats.interventionsToday}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">À attribuer</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingStats ? '-' : stats.interventionsToAssign}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clients actifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingStats ? '-' : stats.activeClients}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Logements</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingStats ? '-' : stats.totalLogements}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section interventions récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Interventions à venir
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
            Aucune intervention programmée
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
