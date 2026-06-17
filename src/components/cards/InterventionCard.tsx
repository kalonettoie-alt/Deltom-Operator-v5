import { Calendar, MapPin, Users, Baby, Clock, Edit2, Trash2, Zap, Euro } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { InterventionTypeLabels } from '../../types';
import type { InterventionWithRelations } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { canSeeFinancials } from '../../utils/permissions';

interface InterventionCardProps {
  intervention: InterventionWithRelations;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  showLogement?: boolean;
  showClient?: boolean;
  showPrestataire?: boolean;
  showTarification?: boolean;
}

export function InterventionCard({
  intervention,
  onEdit,
  onDelete,
  onClick,
  showLogement = true,
  showClient = false,
  showPrestataire = true,
  showTarification = false,
}: InterventionCardProps) {
  const { profile } = useAuth();

  // Calcul du gain pour cette intervention
  const prixClient = intervention.prix_client_ttc || 0;
  const prixPrestataire = intervention.prix_prestataire_ht || 0;
  const blanchisserie = intervention.blanchisserie_incluse ? (intervention.prix_blanchisserie || 0) : 0;
  const gain = prixClient + blanchisserie - prixPrestataire;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`card hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Date et statut */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{formatDate(intervention.date)}</span>
            </div>
            <StatusBadge status={intervention.status} />
            {intervention.checkin_meme_jour && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                <Zap className="w-3 h-3" />
                Check-in meme jour
              </span>
            )}
          </div>

          {/* Logement */}
          {showLogement && intervention.logement && (
            <div className="mb-2">
              <h3 className="font-semibold text-gray-900">{intervention.logement.name}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>
                  {intervention.logement.address}, {intervention.logement.city}
                </span>
              </div>
            </div>
          )}

          {/* Client */}
          {showClient && intervention.client && (
            <p className="text-sm text-gray-600">
              Client: <span className="font-medium">{intervention.client.full_name}</span>
            </p>
          )}

          {/* Type et infos */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              {InterventionTypeLabels[intervention.type]}
            </span>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{intervention.nb_voyageurs} voyageurs</span>
            </div>
            {intervention.has_baby && (
              <div className="flex items-center gap-1 text-pink-600">
                <Baby className="w-4 h-4" />
                <span>Bébé</span>
              </div>
            )}
          </div>

          {/* Prestataire */}
          {showPrestataire && (
            <div className="mt-3">
              {intervention.prestataire ? (
                <p className="text-sm text-gray-600">
                  Prestataire:{' '}
                  <span className="font-medium">{intervention.prestataire.full_name}</span>
                </p>
              ) : (
                <p className="text-sm text-orange-600 font-medium">
                  Aucun prestataire assigné
                </p>
              )}
            </div>
          )}

          {/* Heures de début/fin */}
          {(intervention.started_at || intervention.completed_at) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {intervention.started_at && (
                <span>
                  Début: {new Date(intervention.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {intervention.completed_at && (
                <span>
                  - Fin: {new Date(intervention.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* Tarification — masquée pour les rôles sans accès financier (ex: support) */}
          {showTarification && canSeeFinancials(profile?.role) && (prixClient > 0 || prixPrestataire > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Tarification</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prestataire</span>
                  <span className="text-red-600">-{prixPrestataire.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="text-green-600">+{prixClient.toFixed(2)} €</span>
                </div>
                {blanchisserie > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">Blanchisserie</span>
                    <span className="text-purple-600">+{blanchisserie.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between col-span-2 pt-2 border-t border-gray-100">
                  <span className="font-medium text-gray-700">Gain</span>
                  <span className={`font-bold ${gain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {gain.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 ml-4">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Instructions spéciales */}
      {intervention.special_instructions && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Instructions:</span> {intervention.special_instructions}
          </p>
        </div>
      )}
    </div>
  );
}
