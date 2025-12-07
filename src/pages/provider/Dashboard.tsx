import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { supabase } from '../../config/supabase';
import { Calendar, ClipboardList, CheckCircle, Play, Euro, Clock, Check, X } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export function ProviderDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { interventions, isLoading, refetch } = useInterventions({
    prestataireId: profile?.id,
    withRelations: true,
  });

  const [processingId, setProcessingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Calculer les stats
  const stats = useMemo(() => {
    const todayMissions = interventions.filter((i) => i.date === today);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const weekMissions = interventions.filter((i) => {
      const date = new Date(i.date);
      return date >= startOfWeek && date <= endOfWeek;
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const completedThisMonth = interventions.filter((i) => {
      const date = new Date(i.date);
      return date >= startOfMonth && i.status === 'terminee';
    });

    // Revenus générés (somme des prix prestataire HT des missions terminées)
    const revenusGeneres = interventions
      .filter((i) => i.status === 'terminee')
      .reduce((sum, i) => sum + (i.prix_prestataire_ht || 0), 0);

    return {
      today: todayMissions.length,
      week: weekMissions.length,
      completedMonth: completedThisMonth.length,
      revenus: revenusGeneres,
    };
  }, [interventions, today]);

  // Missions du jour
  const todayMissions = interventions.filter((i) => i.date === today && i.status !== 'assignee');

  // Missions en attente de réponse (statut assignee)
  const pendingMissions = interventions.filter((i) => i.status === 'assignee');

  // Accepter une mission
  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ status: 'acceptee' } as never)
        .eq('id', id);

      if (error) {
        alert(error.message);
      } else {
        refetch();
      }
    } finally {
      setProcessingId(null);
    }
  };

  // Refuser une mission
  const handleRefuse = async (id: string) => {
    if (!profile?.id) return;

    setProcessingId(id);
    try {
      // Récupérer l'intervention pour obtenir refused_by actuel
      const { data: intervention, error: fetchError } = await supabase
        .from('interventions')
        .select('refused_by')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erreur fetch intervention:', fetchError);
        alert('Erreur lors de la récupération de l\'intervention');
        return;
      }

      // Gérer le cas où refused_by est null, undefined, ou un tableau
      let currentRefusedBy: string[] = [];
      const interventionData = intervention as unknown as { refused_by?: string[] } | null;
      if (interventionData && interventionData.refused_by && Array.isArray(interventionData.refused_by)) {
        currentRefusedBy = interventionData.refused_by;
      }

      // Mettre à jour l'intervention - retirer le prestataire et remettre en attente d'attribution
      const { error } = await supabase
        .from('interventions')
        .update({
          status: 'a_attribuer',
          prestataire_id: null,
          refused_by: [...currentRefusedBy, profile.id],
        } as never)
        .eq('id', id);

      if (error) {
        console.error('Erreur update intervention:', error);
        alert('Erreur: ' + error.message);
      } else {
        refetch();
      }
    } catch (err) {
      console.error('Erreur handleRefuse:', err);
      alert('Une erreur est survenue');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {profile?.full_name}
        </h1>
        <p className="text-gray-600 mt-1">Vos missions du jour</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Missions aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <ClipboardList className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cette semaine</p>
              <p className="text-2xl font-bold text-gray-900">{stats.week}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Terminées ce mois</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedMonth}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Euro className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenus générés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.revenus.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Missions en attente de réponse */}
      {pendingMissions.length > 0 && (
        <div className="card mb-6 bg-orange-50 border-orange-200">
          <h2 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Missions en attente de réponse ({pendingMissions.length})
          </h2>
          <div className="space-y-3">
            {pendingMissions.map((mission) => (
              <div
                key={mission.id}
                className="p-4 bg-white rounded-lg border border-orange-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/prestataire/missions/${mission.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {mission.logement?.name}
                      </h3>
                      <StatusBadge status={mission.status} />
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(mission.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {mission.logement?.address}, {mission.logement?.city}
                    </p>
                    <p className="text-sm font-medium text-purple-600 mt-1">
                      {mission.prix_prestataire_ht}€ HT
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefuse(mission.id)}
                      disabled={processingId === mission.id}
                      className="btn-secondary flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {processingId === mission.id ? (
                        <Loader size="sm" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Refuser
                    </button>
                    <button
                      onClick={() => handleAccept(mission.id)}
                      disabled={processingId === mission.id}
                      className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {processingId === mission.id ? (
                        <Loader size="sm" className="border-white border-t-transparent" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missions du jour */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Missions du jour
        </h2>

        {todayMissions.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-gray-400" />}
            title="Aucune mission aujourd'hui"
            description="Vous n'avez pas de mission programmée pour aujourd'hui."
          />
        ) : (
          <div className="space-y-3">
            {todayMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => navigate(`/prestataire/missions/${mission.id}`)}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {mission.logement?.name}
                      </h3>
                      <StatusBadge status={mission.status} />
                    </div>
                    <p className="text-sm text-gray-600">
                      {mission.logement?.address}, {mission.logement?.city}
                    </p>
                  </div>
                  {mission.status === 'acceptee' && (
                    <button className="btn-primary flex items-center gap-2 text-sm">
                      <Play className="w-4 h-4" />
                      Commencer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
