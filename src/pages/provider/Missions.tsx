import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { InterventionCard } from '../../components/cards/InterventionCard';
import { InterventionStatusLabels } from '../../types';
import type { InterventionStatus } from '../../types';

export function ProviderMissions() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { interventions, isLoading } = useInterventions({
    prestataireId: profile?.id,
    withRelations: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | ''>('');

  // Filtrer les interventions
  const filteredMissions = interventions.filter((i) => {
    const matchesSearch =
      i.logement?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.logement?.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Trier par date (plus récentes d'abord)
  const sortedMissions = [...filteredMissions].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mes missions</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">{interventions.length} mission(s) assignée(s)</p>
      </div>

      {/* Filtres */}
      {interventions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par logement ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | '')}
                className="input-field pl-10"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(InterventionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Liste des missions */}
      {interventions.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-6 h-6 text-gray-400" />}
          title="Aucune mission"
          description="Vous n'avez pas encore de mission assignée."
        />
      ) : filteredMissions.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucune mission ne correspond à vos critères."
        />
      ) : (
        <div className="grid gap-4">
          {sortedMissions.map((mission) => (
            <InterventionCard
              key={mission.id}
              intervention={mission}
              showPrestataire={false}
              onClick={() => navigate(`/prestataire/missions/${mission.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
