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
  ChevronDown,
  ChevronUp,
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
    interventionsTodayDone: 0,
    interventionsToAssign: 0,
    activeClients: 0,
    totalLogements: 0,
    totalPrestataires: 0,
    // Détail du gain
    totalFactureClient: 0,
    totalPayePrestataire: 0,
    margeMenages: 0,
    blanchisserieInterventions: 0,
    blanchisserieForfaits: 0,
    totalBlanchisserie: 0,
    gainTotal: 0,
  });
  const [upcomingInterventions, setUpcomingInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Détail du gain cliquable
  const [showGainDetail, setShowGainDetail] = useState(false);
  const [gainInterventions, setGainInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoadingGainDetail, setIsLoadingGainDetail] = useState(false);

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

        // Interventions du jour terminées
        const { count: todayDoneCount } = await supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .eq('status', 'terminee');

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

        // Gain du mois (interventions terminées)
        const { data: revenusData } = await supabase
          .from('interventions')
          .select('prix_client_ttc, prix_prestataire_ht, blanchisserie_incluse, prix_blanchisserie')
          .eq('status', 'terminee')
          .gte('date', firstDayOfMonth)
          .lte('date', lastDayOfMonth);

        interface InterventionRevenu {
          prix_client_ttc: number;
          prix_prestataire_ht: number;
          blanchisserie_incluse: boolean;
          prix_blanchisserie: number;
        }

        // Calcul détaillé des revenus
        let totalFactureClient = 0;
        let totalPayePrestataire = 0;
        let blanchisserieInterventions = 0;

        (revenusData as InterventionRevenu[] | null)?.forEach((intervention) => {
          totalFactureClient += intervention.prix_client_ttc || 0;
          totalPayePrestataire += intervention.prix_prestataire_ht || 0;
          if (intervention.blanchisserie_incluse) {
            blanchisserieInterventions += intervention.prix_blanchisserie || 0;
          }
        });

        // Récupérer les forfaits blanchisserie mensuels des logements
        const { data: logementsAvecForfait } = await supabase
          .from('logements')
          .select('prix_blanchisserie')
          .eq('type_blanchisserie', 'forfait');

        interface LogementForfait {
          prix_blanchisserie: number | null;
        }

        const blanchisserieForfaits = (logementsAvecForfait as LogementForfait[] | null)?.reduce(
          (sum, l) => sum + (l.prix_blanchisserie || 0),
          0
        ) || 0;

        // Calculs finaux
        const margeMenages = totalFactureClient - totalPayePrestataire;
        const totalBlanchisserie = blanchisserieInterventions + blanchisserieForfaits;
        const gainTotal = margeMenages + totalBlanchisserie;

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
          interventionsTodayDone: todayDoneCount || 0,
          interventionsToAssign: toAssignCount || 0,
          activeClients: clientsCount || 0,
          totalLogements: logementsCount || 0,
          totalPrestataires: prestatairesCount || 0,
          // Détail du gain
          totalFactureClient,
          totalPayePrestataire,
          margeMenages,
          blanchisserieInterventions,
          blanchisserieForfaits,
          totalBlanchisserie,
          gainTotal,
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

  // Charger le détail des interventions pour le gain
  const toggleGainDetail = async () => {
    if (showGainDetail) {
      setShowGainDetail(false);
      return;
    }

    setIsLoadingGainDetail(true);
    try {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('interventions')
        .select(`
          *,
          logement:logements(name, city),
          prestataire:profiles!interventions_prestataire_id_fkey(full_name)
        `)
        .eq('status', 'terminee')
        .gte('date', firstDay)
        .lte('date', lastDayStr)
        .order('date', { ascending: false });

      setGainInterventions((data as InterventionWithRelations[]) || []);
      setShowGainDetail(true);
    } catch (error) {
      console.error('Erreur chargement détail gain:', error);
    } finally {
      setIsLoadingGainDetail(false);
    }
  };

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

      {/* Carte Gain du mois - Cliquable pour voir le détail */}
      <div
        className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 md:p-6 text-white mb-6 cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-all"
        onClick={toggleGainDetail}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Gain total du mois</p>
            <p className="text-3xl md:text-4xl font-bold">
              {isLoadingStats ? '...' : formatCurrency(stats.gainTotal)}
            </p>
            <p className="text-emerald-100 text-sm mt-2 capitalize">{currentMonthName}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Euro className="w-8 h-8 text-white" />
            </div>
            {showGainDetail ? (
              <ChevronUp className="w-5 h-5 text-emerald-200" />
            ) : (
              <ChevronDown className="w-5 h-5 text-emerald-200" />
            )}
          </div>
        </div>
        <p className="text-emerald-200 text-xs mt-2">
          Cliquez pour {showGainDetail ? 'masquer' : 'voir'} le detail
        </p>
      </div>

      {/* Détail des interventions du gain */}
      {showGainDetail && (
        <div className="card mb-6 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Interventions terminees du mois</h3>

          {isLoadingGainDetail ? (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          ) : gainInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Aucune intervention terminee ce mois</p>
          ) : (
            <div className="space-y-2">
              {gainInterventions.map((intervention) => {
                const prixClient = (intervention.prix_client_ttc || 0) + (intervention.blanchisserie_incluse ? (intervention.prix_blanchisserie || 0) : 0);
                const prixPresta = intervention.prix_prestataire_ht || 0;
                const gain = prixClient - prixPresta;

                return (
                  <div
                    key={intervention.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/interventions/${intervention.id}`); }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{intervention.logement?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(intervention.date).toLocaleDateString('fr-FR')}
                          {intervention.prestataire ? ` - ${intervention.prestataire.full_name}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {gain >= 0 ? '+' : ''}{gain.toFixed(2)}€
                        </p>
                        <p className="text-xs text-gray-500">
                          Client: {prixClient.toFixed(0)}€ | Presta: {prixPresta.toFixed(0)}€
                        </p>
                      </div>
                    </div>
                    {intervention.blanchisserie_incluse && (intervention.prix_blanchisserie || 0) > 0 && (
                      <p className="text-xs text-purple-600 mt-1">
                        Blanchisserie: +{(intervention.prix_blanchisserie || 0).toFixed(2)}€
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Total forfaits blanchisserie */}
              {stats.blanchisserieForfaits > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-purple-700">Forfaits blanchisserie mensuels</span>
                    <span className="font-semibold text-purple-700">+{stats.blanchisserieForfaits.toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Détail des revenus du mois */}
      {!isLoadingStats && (stats.totalFactureClient > 0 || stats.totalBlanchisserie > 0) && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            Detail du mois
          </h3>

          <div className="space-y-4 text-sm">
            {/* Section Ménages */}
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Menages</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Facture aux clients</span>
                  <span className="text-green-600 font-medium">+{stats.totalFactureClient.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paye aux prestataires</span>
                  <span className="text-red-600 font-medium">-{stats.totalPayePrestataire.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                  <span className="font-medium text-gray-700">Marge menages</span>
                  <span className="font-semibold">{stats.margeMenages.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Section Blanchisserie */}
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Blanchisserie</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Par intervention</span>
                  <span className="text-purple-600 font-medium">+{stats.blanchisserieInterventions.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Forfaits mensuels</span>
                  <span className="text-purple-600 font-medium">+{stats.blanchisserieForfaits.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                  <span className="font-medium text-gray-700">Total blanchisserie</span>
                  <span className="font-semibold text-purple-700">{stats.totalBlanchisserie.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Gain Total */}
            <div className="pt-2">
              <div className="flex justify-between text-lg">
                <span className="font-bold text-gray-900">GAIN TOTAL</span>
                <span className="font-bold text-green-600">{stats.gainTotal.toFixed(2)} €</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">= Marge menages + Blanchisserie</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Aujourd'hui</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                {isLoadingStats ? '-' : (
                  <>
                    <span className={stats.interventionsTodayDone === stats.interventionsToday && stats.interventionsToday > 0 ? 'text-green-600' : 'text-orange-600'}>
                      {stats.interventionsTodayDone}
                    </span>
                    <span className="text-gray-400 text-xl">/{stats.interventionsToday}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isLoadingStats ? '' : stats.interventionsTodayDone === stats.interventionsToday && stats.interventionsToday > 0
                  ? '✓ Toutes terminées'
                  : `${stats.interventionsToday - stats.interventionsTodayDone} restante(s)`}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <ClipboardList className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
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
                showTarification
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
