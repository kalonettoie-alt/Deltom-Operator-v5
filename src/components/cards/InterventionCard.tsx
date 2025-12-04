import { Calendar, MapPin, Users, Baby, Clock, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { InterventionTypeLabels } from '../../types';
import type { InterventionWithRelations } from '../../types';

interface InterventionCardProps {
  intervention: InterventionWithRelations;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  showLogement?: boolean;
  showClient?: boolean;
  showPrestataire?: boolean;
}

export function InterventionCard({
  intervention,
  onEdit,
  onDelete,
  onClick,
  showLogement = true,
  showClient = false,
  showPrestataire = true,
}: InterventionCardProps) {
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
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{formatDate(intervention.date)}</span>
            </div>
            <StatusBadge status={intervention.status} />
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
