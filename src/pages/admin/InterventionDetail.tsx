import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Baby, Clock, User, FileText, ZoomIn, CheckSquare, Circle, CheckCircle, Zap, AlertTriangle, Camera } from 'lucide-react';
import { useIntervention } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { InterventionTypeLabels } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { canSeeFinancials } from '../../utils/permissions';

interface TacheRapport {
  id: string;
  label: string;
  effectuee: boolean;
}

export function AdminInterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { intervention, isLoading, error } = useIntervention(id || '');
  // Masque les chiffres financiers pour les rôles sans accès (ex: support)
  const showFinancials = canSeeFinancials(profile?.role);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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
        <p className="text-red-600 mb-4">{error || 'Intervention non trouvee'}</p>
        <button onClick={() => navigate('/admin/interventions')} className="btn-secondary">
          Retour a la liste
        </button>
      </div>
    );
  }

  const tachesEffectuees = intervention.rapport?.taches_effectuees as TacheRapport[] | undefined;

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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Intervention du {formatDate(intervention.date)}
            </h1>
            <StatusBadge status={intervention.status} />
          </div>
          <p className="text-gray-600 mt-1">{intervention.logement?.name}</p>
        </div>
      </div>

      {/* Alerte Check-in meme jour */}
      {intervention.checkin_meme_jour && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-orange-800">Check-in prevu le meme jour</p>
            <p className="text-sm text-orange-700">
              Les voyageurs arrivent juste apres le menage.
            </p>
          </div>
        </div>
      )}

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
                  <span className="font-medium">Code d'acces:</span> {intervention.logement.access_code}
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
            Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                {InterventionTypeLabels[intervention.type]}
              </span>
              {intervention.checkin_meme_jour && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  Check-in meme jour
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{intervention.nb_voyageurs} voyageurs</span>
            </div>
            {intervention.has_baby && (
              <div className="flex items-center gap-2 text-pink-600">
                <Baby className="w-4 h-4" />
                <span>Equipement bebe requis</span>
              </div>
            )}
            {intervention.special_instructions && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Instructions speciales:</span>{' '}
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
            <p className="text-orange-600 font-medium">Aucun prestataire assigne</p>
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
                  <span className="font-medium">Debut:</span> {formatDateTime(intervention.started_at)}
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

        {/* Tarification (masquée pour support) */}
        {showFinancials && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarification</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Prix prestataire HT:</span>{' '}
              {intervention.prix_prestataire_ht.toFixed(2)} EUR
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Prix client TTC:</span>{' '}
              {intervention.prix_client_ttc.toFixed(2)} EUR
            </p>
          </div>
        </div>
        )}

        {/* Photos etat des lieux */}
        {intervention.photos_etat_lieux && (intervention.photos_etat_lieux as string[]).length > 0 && (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-400" />
              Photos etat des lieux (avant)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(intervention.photos_etat_lieux as string[]).map((photo, index) => (
                <div
                  key={index}
                  onClick={() => openLightbox(intervention.photos_etat_lieux as string[], index)}
                  className="cursor-pointer group relative overflow-hidden rounded-xl"
                >
                  <img
                    src={photo}
                    alt={`Etat des lieux ${index + 1}`}
                    className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rapport */}
        {intervention.rapport && (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Rapport
            </h2>
            <div className="space-y-6">
              {/* Photos intervention */}
              {intervention.rapport.photos_intervention && intervention.rapport.photos_intervention.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-3">Photos de l'intervention:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {intervention.rapport.photos_intervention.map((url, index) => (
                      <div
                        key={index}
                        onClick={() => openLightbox(intervention.rapport!.photos_intervention, index)}
                        className="cursor-pointer group relative overflow-hidden rounded-xl"
                      >
                        <img
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 md:h-40 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Taches effectuees */}
              {tachesEffectuees && tachesEffectuees.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    Taches effectuees
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tachesEffectuees.map((tache) => (
                      <div
                        key={tache.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          tache.effectuee ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        {tache.effectuee ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={tache.effectuee ? 'text-gray-900' : 'text-gray-500'}>
                          {tache.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Degats signales */}
              {intervention.rapport.degats_signales && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Degats signales
                  </p>
                  <p className="text-red-600 mb-3">{intervention.rapport.degats_description}</p>
                  {intervention.rapport.degats_photos && intervention.rapport.degats_photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {intervention.rapport.degats_photos.map((url, index) => (
                        <div
                          key={index}
                          onClick={() => openLightbox(intervention.rapport!.degats_photos, index)}
                          className="cursor-pointer group relative overflow-hidden rounded-xl"
                        >
                          <img
                            src={url}
                            alt={`Degat ${index + 1}`}
                            className="w-full h-32 object-cover border-2 border-red-300 transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
