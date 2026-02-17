import { Building2, MapPin, Key } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLogements } from '../../hooks/useLogements';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';

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
    <div className="pb-20 md:pb-0">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500" />
          Mes logements
        </h1>
        <p className="text-sm text-gray-500 mt-1">{logements.length} logement(s) enregistré(s)</p>
      </div>

      {logements.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-gray-400" />}
          title="Aucun logement"
          description="Vous n'avez pas encore de logement enregistré. Contactez l'administrateur pour en ajouter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {logements.map((logement) => (
            <div
              key={logement.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Header avec couleur */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <h3 className="font-semibold text-lg">{logement.name}</h3>
                <p className="text-blue-100 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {logement.city}
                </p>
              </div>

              {/* Infos */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{logement.address}, {logement.postal_code} {logement.city}</span>
                </div>

                {logement.access_code && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>Code : {logement.access_code}</span>
                  </div>
                )}

                {/* Badges tarification */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {logement.prix_client_ttc && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                      🧹 Ménage : {logement.prix_client_ttc}€
                    </span>
                  )}
                  {logement.type_blanchisserie === 'forfait' && logement.prix_blanchisserie && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                      🧺 Forfait : {logement.prix_blanchisserie}€/mois
                    </span>
                  )}
                  {logement.type_blanchisserie === 'intervention' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                      🧺 À l'intervention
                    </span>
                  )}
                </div>

                {logement.instructions && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Instructions</p>
                    <p className="text-sm text-gray-600">{logement.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
