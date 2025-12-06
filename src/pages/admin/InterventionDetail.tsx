import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Baby, Clock, User, FileText } from 'lucide-react';
import { useIntervention } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { InterventionTypeLabels } from '../../types';

export function AdminInterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { intervention, isLoading, error } = useIntervention(id || '');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Intervention non trouvée'}</p>
        <button onClick={() => navigate('/admin/interventions')} className="btn-secondary">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/interventions')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Intervention du {formatDate(intervention.date)}
            </h1>
            <StatusBadge status={intervention.status} />
          </div>
          <p className="text-gray-600 mt-1">{intervention.logement?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Infos logement */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            Logement
          </h2>
          {intervention.logement && (
            <div className="space-y-2">
              <p className="font-medium">{intervention.logement.name}</p>
              <p className="text-gray-600">
                {intervention.logement.address}
                <br />
                {intervention.logement.postal_code} {intervention.logement.city}
              </p>
              {intervention.logement.access_code && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Code d'accès:</span> {intervention.logement.access_code}
                </p>
              )}
              {intervention.logement.instructions && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Instructions:</span> {intervention.logement.instructions}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Infos intervention */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Détails
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                {InterventionTypeLabels[intervention.type]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{intervention.nb_voyageurs} voyageurs</span>
            </div>
            {intervention.has_baby && (
              <div className="flex items-center gap-2 text-pink-600">
                <Baby className="w-4 h-4" />
                <span>Équipement bébé requis</span>
              </div>
            )}
            {intervention.special_instructions && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Instructions spéciales:</span>{' '}
                  {intervention.special_instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Client
          </h2>
          {intervention.client && (
            <div className="space-y-2">
              <p className="font-medium">{intervention.client.full_name}</p>
              <p className="text-gray-600">{intervention.client.email}</p>
              {intervention.client.phone && (
                <p className="text-gray-600">{intervention.client.phone}</p>
              )}
            </div>
          )}
        </div>

        {/* Prestataire */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Prestataire
          </h2>
          {intervention.prestataire ? (
            <div className="space-y-2">
              <p className="font-medium">{intervention.prestataire.full_name}</p>
              <p className="text-gray-600">{intervention.prestataire.email}</p>
              {intervention.prestataire.phone && (
                <p className="text-gray-600">{intervention.prestataire.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-orange-600 font-medium">Aucun prestataire assigné</p>
          )}
        </div>

        {/* Timing */}
        {(intervention.started_at || intervention.completed_at) && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Timing
            </h2>
            <div className="space-y-2">
              {intervention.started_at && (
                <p className="text-gray-600">
                  <span className="font-medium">Début:</span> {formatDateTime(intervention.started_at)}
                </p>
              )}
              {intervention.completed_at && (
                <p className="text-gray-600">
                  <span className="font-medium">Fin:</span> {formatDateTime(intervention.completed_at)}
                </p>
              )}
              {intervention.started_at && intervention.completed_at && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <p className="text-primary-600 font-medium">
                    <span className="text-gray-600">Temps de nettoyage:</span>{' '}
                    {(() => {
                      const start = new Date(intervention.started_at!);
                      const end = new Date(intervention.completed_at!);
                      const diffMs = end.getTime() - start.getTime();
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      const hours = Math.floor(diffMins / 60);
                      const mins = diffMins % 60;
                      if (hours > 0) {
                        return `${hours}h ${mins}min`;
                      }
                      return `${mins}min`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tarification */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarification</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Prix prestataire HT:</span>{' '}
              {intervention.prix_prestataire_ht.toFixed(2)} €
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Prix client TTC:</span>{' '}
              {intervention.prix_client_ttc.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Rapport */}
        {intervention.rapport && (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Rapport
            </h2>
            <div className="space-y-4">
              {intervention.rapport.photos_intervention.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Photos de l'intervention:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {intervention.rapport.photos_intervention.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {intervention.rapport.degats_signales && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="font-medium text-red-600 mb-2">Dégâts signalés:</p>
                  <p className="text-gray-600">{intervention.rapport.degats_description}</p>
                  {intervention.rapport.degats_photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {intervention.rapport.degats_photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Dégât ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-red-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
