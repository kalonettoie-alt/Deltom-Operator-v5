import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogements } from '../../hooks/useLogements';
import { useInterventions } from '../../hooks/useInterventions';
import { Building2, ClipboardList, CheckCircle, Euro, Calendar } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { getClientStatus, ClientStatusLabels } from '../../types';

// Composant badge simplifié pour les clients
function ClientStatusBadge({ status }: { status: 'a_venir' | 'en_cours' | 'terminee' }) {
  const colors: Record<string, string> = {
    a_venir: 'bg-blue-100 text-blue-800',
    en_cours: 'bg-purple-100 text-purple-800',
    terminee: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {ClientStatusLabels[status]}
    </span>
  );
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { logements, isLoading: isLoadingLogements } = useLogements({
    clientId: profile?.id,
  });
  const { interventions, isLoading: isLoadingInterventions } = useInterventions({
    clientId: profile?.id,
    withRelations: true,
  });

  const today = new Date().toISOString().split('T')[0];

  // Calculer les stats
  const stats = useMemo(() => {
    // Interventions en cours (acceptee, en_cours)
    const enCours = interventions.filter(
      (i) => i.status === 'en_cours' || i.status === 'acceptee'
    );

    // Interventions terminées ce mois (string comparison pour eviter les problemes de timezone)
    const now = new Date();
    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const completedThisMonth = interventions.filter(
      (i) => i.date >= startOfMonthStr && i.status === 'terminee'
    );

    // Facture du mois (somme des prix client TTC des interventions terminées du mois)
    const factureMonth = completedThisMonth.reduce(
      (sum, i) => sum + (i.prix_client_ttc || 0),
      0
    );

    // Nom du mois en cours
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });

    return {
      logements: logements.length,
      enCours: enCours.length,
      completedMonth: completedThisMonth.length,
      factureMonth,
      currentMonthName,
    };
  }, [logements, interventions]);

  // Missions du JOUR uniquement (pas toutes les prochaines)
  const todayMissions = interventions
    .filter((i) => i.date === today)
    .sort((a, b) => {
      // Trier par statut: en_cours d'abord, puis acceptee, puis autres
      const order: Record<string, number> = { en_cours: 0, acceptee: 1, assignee: 2, a_attribuer: 3, terminee: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

  if (isLoadingLogements || isLoadingInterventions) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Bonjour, {profile?.full_name}
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Suivez vos logements et interventions</p>
      </div>

      {/* Stats cards - grille 2x2 sur mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/client/logements')}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-blue-100 rounded-xl">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Logements</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.logements}</p>
            </div>
          </div>
        </div>

        <div
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/client/interventions')}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-yellow-100 rounded-xl">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">En cours</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.enCours}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 capitalize">Terminées ({stats.currentMonthName})</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.completedMonth}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-purple-200 rounded-xl">
              <Euro className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-purple-600 capitalize">Facture ({stats.currentMonthName})</p>
              <p className="text-lg md:text-2xl font-bold text-purple-900">{stats.factureMonth.toFixed(0)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Missions du jour */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Missions du jour
        </h2>

        {todayMissions.length === 0 ? (
          <div className="text-center py-6">
            <EmptyState
              icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
              title="Aucune intervention aujourd'hui"
              description="Vous n'avez pas d'intervention programmée pour aujourd'hui."
            />
            <Link
              to="/client/calendrier"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
            >
              <Calendar className="w-4 h-4" />
              Voir le calendrier
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todayMissions.map((intervention) => {
              const clientStatus = getClientStatus(intervention.status);
              return (
                <div
                  key={intervention.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => navigate('/client/interventions')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {intervention.logement?.name}
                        </span>
                        <ClientStatusBadge status={clientStatus} />
                      </div>
                      <p className="text-sm text-gray-600">
                        {intervention.logement?.address}, {intervention.logement?.city}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <Link
              to="/client/calendrier"
              className="block text-center text-sm text-primary-600 hover:text-primary-700 pt-2"
            >
              Voir le calendrier complet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
