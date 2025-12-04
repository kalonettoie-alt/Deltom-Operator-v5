import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Baby, Clock, Key, FileText, Play, CheckCircle } from 'lucide-react';
import { useIntervention, useInterventions } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { InterventionTypeLabels } from '../../types';

export function ProviderMissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { intervention, isLoading, error, refetch } = useIntervention(id || '');
  const { startIntervention, completeIntervention } = useInterventions();

  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const handleStart = async () => {
    if (!id) return;
    setIsStarting(true);
    try {
      const { error } = await startIntervention(id);
      if (error) {
        alert(error);
      } else {
        refetch();
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      const { error } = await completeIntervention(id);
      if (error) {
        alert(error);
      } else {
        setShowReportModal(true);
        refetch();
      }
    } finally {
      setIsCompleting(false);
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
        <p className="text-red-600 mb-4">{error || 'Mission non trouvée'}</p>
        <button onClick={() => navigate('/prestataire/missions')} className="btn-secondary">
          Retour à mes missions
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/prestataire/missions')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {intervention.logement?.name}
            </h1>
            <StatusBadge status={intervention.status} />
          </div>
          <p className="text-gray-600 mt-1">{formatDate(intervention.date)}</p>
        </div>
      </div>

      {/* Actions */}
      {(intervention.status === 'acceptee' || intervention.status === 'en_cours') && (
        <div className="card mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-primary-900">
                {intervention.status === 'acceptee'
                  ? 'Prêt à commencer ?'
                  : 'Mission en cours'}
              </h2>
              <p className="text-sm text-primary-700">
                {intervention.status === 'acceptee'
                  ? 'Cliquez sur le bouton pour démarrer la mission.'
                  : 'Cliquez sur le bouton quand vous avez terminé.'}
              </p>
            </div>
            {intervention.status === 'acceptee' ? (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="btn-primary flex items-center gap-2"
              >
                {isStarting ? (
                  <Loader size="sm" className="border-white border-t-transparent" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Commencer
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
              >
                {isCompleting ? (
                  <Loader size="sm" className="border-white border-t-transparent" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Terminer
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
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
                  <Key className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Code d'accès</p>
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
            Détails de la mission
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
          </div>
        </div>

        {/* Instructions */}
        {(intervention.logement?.instructions || intervention.special_instructions) && (
          <div className="card lg:col-span-2">
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
                  <p className="text-sm font-medium text-gray-700">Instructions spéciales:</p>
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
                  <span className="font-medium">Début:</span> {formatDateTime(intervention.started_at)}
                </p>
              )}
              {intervention.completed_at && (
                <p className="text-gray-600">
                  <span className="font-medium">Fin:</span> {formatDateTime(intervention.completed_at)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de rapport */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Mission terminée !"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-600 mb-6">
            La mission a été marquée comme terminée. Vous pouvez maintenant soumettre votre rapport.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowReportModal(false)}
              className="btn-secondary"
            >
              Plus tard
            </button>
            <button
              onClick={() => {
                setShowReportModal(false);
                // TODO: Naviguer vers le formulaire de rapport
              }}
              className="btn-primary"
            >
              Faire le rapport
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
