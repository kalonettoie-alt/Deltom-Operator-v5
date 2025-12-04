import { Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLogements } from '../../hooks/useLogements';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { LogementCard } from '../../components/cards/LogementCard';

export function ClientLogements() {
  const { profile } = useAuth();
  const { logements, isLoading } = useLogements({
    clientId: profile?.id,
    withClient: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes logements</h1>
        <p className="text-gray-600 mt-1">{logements.length} logement(s) enregistré(s)</p>
      </div>

      {logements.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-gray-400" />}
          title="Aucun logement"
          description="Vous n'avez pas encore de logement enregistré. Contactez l'administrateur pour en ajouter."
        />
      ) : (
        <div className="grid gap-4">
          {logements.map((logement) => (
            <LogementCard key={logement.id} logement={logement} showClient={false} />
          ))}
        </div>
      )}
    </div>
  );
}
