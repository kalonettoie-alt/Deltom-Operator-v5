import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Baby, Clock, Key, FileText, CheckCircle, AlertCircle, Zap, AlertTriangle, ZoomIn, CheckSquare, Circle } from 'lucide-react';
import { useIntervention } from '../../hooks/useInterventions';
import { useRapports } from '../../hooks/useRapports';
import { supabase } from '../../config/supabase';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { ReportForm } from '../../components/forms/ReportForm';
import { EtatDesLieuxModal } from '../../components/modals/EtatDesLieuxModal';
import { InterventionTypeLabels } from '../../types';
import type { RapportInsert } from '../../types';

interface TacheRapport {
  id: string;
  label: string;
  effectuee: boolean;
}

export function ProviderMissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    intervention,
    isLoading,
    error,
    refetch,
    startIntervention,
    completeIntervention,
  } = useIntervention(id || '');
  const { createRapport } = useRapports();

  const [isStarting, setIsStarting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEtatLieuxModal, setShowEtatLieuxModal] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const isToday = intervention?.date === today;

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

  // Ouvrir la modale etat des lieux au lieu de demarrer directement
  const handleStartClick = () => {
    if (!id || !isToday) return;
    setShowEtatLieuxModal(true);
  };

  // Soumission des photos etat des lieux puis demarrage
  const handleEtatLieuxSubmit = async (photos: string[]) => {
    if (!id) return;
    setIsStarting(true);
    try {
      // Sauvegarder les photos etat des lieux
      const { error: updateError } = await supabase
        .from('interventions')
        .update({
          photos_etat_lieux: photos,
          etat_lieux_at: new Date().toISOString(),
        } as never)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur sauvegarde photos etat des lieux:', updateError);
        alert('Erreur lors de la sauvegarde des photos');
        return;
      }

      // Demarrer l'intervention via RPC
      const { error } = await startIntervention();
      if (error) {
        alert(error);
      } else {
        setShowEtatLieuxModal(false);
        refetch();
      }
    } finally {
      setIsStarting(false);
    }
  };

  // Quand on clique sur "Terminer", on ouvre le formulaire de rapport
  const handleComplete = () => {
    setShowReportModal(true);
  };

  // Soumettre le rapport (ce qui termine aussi l'intervention via RPC)
  const handleSubmitReport = async (data: RapportInsert) => {
    if (!id) return;
    setIsSubmittingReport(true);
    try {
      // 1. Creer le rapport
      console.log('[MissionDetail] Creation du rapport...');
      const { error: rapportError } = await createRapport(data);
      if (rapportError) {
        console.error('[MissionDetail] Erreur creation rapport:', rapportError);
        alert(rapportError);
        return;
      }
      console.log('[MissionDetail] Rapport cree avec succes');

      // 2. Terminer l'intervention via RPC
      console.log('[MissionDetail] Appel terminer_intervention via RPC...');
      const { error: completeError } = await completeIntervention();
      if (completeError) {
        console.error('[MissionDetail] Erreur terminer intervention:', completeError);
        alert(completeError);
        return;
      }
      console.log('[MissionDetail] Intervention terminee avec succes');

      setShowReportModal(false);
      refetch();
    } finally {
      setIsSubmittingReport(false);
    }
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
        <p className="text-red-600 mb-4">{error || 'Mission non trouvee'}</p>
        <button onClick={() => navigate('/prestataire/missions')} className="btn-secondary">
          Retour a mes missions
        </button>
      </div>
    );
  }

  const tachesEffectuees = intervention.rapport?.taches_effectuees as TacheRapport[] | undefined;

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/prestataire/missions')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {intervention.logement?.name}
            </h1>
            <StatusBadge status={intervention.status} />
          </div>
          <p className="text-gray-600 mt-1 text-sm md:text-base">{formatDate(intervention.date)}</p>
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
              Les voyageurs arrivent juste apres le menage. Merci de respecter les horaires.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {(intervention.status === 'acceptee' || intervention.status === 'en_cours') && (
        <div className="card mb-6 bg-primary-50 border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-primary-900">
                {intervention.status === 'acceptee'
                  ? 'Pret a commencer ?'
                  : 'Mission en cours'}
              </h2>
              <p className="text-sm text-primary-700">
                {intervention.status === 'acceptee'
                  ? isToday
                    ? 'Prenez des photos de l\'etat des lieux avant de commencer.'
                    : `Disponible le ${formatDate(intervention.date)}`
                  : 'Cliquez sur le bouton quand vous avez termine.'}
              </p>
            </div>
            {intervention.status === 'acceptee' ? (
              <div className="relative group">
                <button
                  onClick={handleStartClick}
                  disabled={isStarting || !isToday}
                  className={`w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2 ${!isToday ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isStarting ? (
                    <Loader size="sm" className="border-white border-t-transparent" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  Commencer
                </button>
                {!isToday && (
                  <div className="hidden sm:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Disponible le jour de l'intervention
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleComplete}
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Terminer
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Infos logement */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            Adresse
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
                <div className="flex items-center gap-2 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Key className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Code d'acces</p>
                    <p className="text-yellow-700">{intervention.logement.access_code}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Infos intervention */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Details de la mission
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
            <div className="pt-2 border-t border-gray-100 mt-2">
              <p className="text-primary-600 font-medium">
                Remuneration: {intervention.prix_prestataire_ht}EUR HT
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {(intervention.logement?.instructions || intervention.special_instructions) && (
          <div className="card md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Instructions
            </h2>
            <div className="space-y-4">
              {intervention.logement?.instructions && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Instructions permanentes:</p>
                  <p className="text-gray-600 mt-1">{intervention.logement.instructions}</p>
                </div>
              )}
              {intervention.special_instructions && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Instructions speciales:</p>
                  <p className="text-gray-600 mt-1">{intervention.special_instructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Rapport affiche si intervention terminee */}
        {intervention.status === 'terminee' && intervention.rapport && (
          <div className="card md:col-span-2">
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

      {/* Modal etat des lieux */}
      <EtatDesLieuxModal
        isOpen={showEtatLieuxModal}
        onClose={() => setShowEtatLieuxModal(false)}
        onSubmit={handleEtatLieuxSubmit}
        interventionId={id || ''}
      />

      {/* Modal de rapport */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Rapport de fin de mission"
        size="lg"
      >
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Ajoutez au moins une photo pour pouvoir terminer la mission.
          </p>
        </div>
        <ReportForm
          interventionId={id || ''}
          interventionType={intervention?.type}
          onSubmit={handleSubmitReport}
          onCancel={() => setShowReportModal(false)}
          isSubmitting={isSubmittingReport}
          showCancelButton={true}
        />
      </Modal>

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
