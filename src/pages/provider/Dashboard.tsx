import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { Calendar, ClipboardList, CheckCircle, Play } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export function ProviderDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { interventions, isLoading } = useInterventions({
    prestataireId: profile?.id,
    withRelations: true,
  });

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

    return {
      today: todayMissions.length,
      week: weekMissions.length,
      completedMonth: completedThisMonth.length,
    };
  }, [interventions, today]);

  // Missions du jour
  const todayMissions = interventions.filter((i) => i.date === today);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>

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
