import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogements } from '../../hooks/useLogements';
import { useInterventions } from '../../hooks/useInterventions';
import { Home, ClipboardList, CheckCircle, Euro, Calendar, FileText, Camera, Image, MapPin } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { getClientStatus, ClientStatusLabels, InterventionTypeLabels } from '../../types';
import type { InterventionWithRelations } from '../../types';

// Composant badge simplifié pour les clients
function ClientStatusBadge({ status }: { status: 'a_venir' | 'en_cours' | 'terminee' }) {
  const colors: Record<string, string> = {
    a_venir: 'bg-blue-100 text-blue-800',
    en_cours: 'bg-purple-100 text-purple-800',
    terminee: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {ClientStatusLabels[status]}
    </span>
  );
}

export function ClientDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { logements, isLoading: isLoadingLogements } = useLogements({
    clientId: profile?.id,
  });
  const { interventions, isLoading: isLoadingInterventions } = useInterventions({
    clientId: profile?.id,
    withRelations: true,
  });

  const [selectedMission, setSelectedMission] = useState<InterventionWithRelations | null>(null);

  // Pour le lightbox des photos
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];

  // Calculer les stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

    // Interventions du mois (toutes)
    const interventionsMois = interventions.filter(
      (i) => i.date >= startOfMonthStr && i.date <= endOfMonthStr
    );

    // Interventions terminées ce mois
    const completedThisMonth = interventions.filter(
      (i) => i.date >= startOfMonthStr && i.status === 'terminee'
    );

    // Facture du mois
    const factureMonth = completedThisMonth.reduce(
      (sum, i) => sum + (i.prix_client_ttc || 0),
      0
    );

    // Blanchisserie du mois
    const blanchisserieInterventions = completedThisMonth
      .filter((i) => i.blanchisserie_incluse)
      .reduce((sum, i) => sum + (i.prix_blanchisserie || 0), 0);

    const forfaitsBlanchisserie = logements
      .filter((l) => l.type_blanchisserie === 'forfait' && l.prix_blanchisserie)
      .reduce((sum, l) => sum + (l.prix_blanchisserie || 0), 0);

    const totalBlanchisserie = blanchisserieInterventions + forfaitsBlanchisserie;

    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });

    return {
      logements: logements.length,
      interventionsMois: interventionsMois.length,
      completedMonth: completedThisMonth.length,
      factureMonth,
      totalBlanchisserie,
      currentMonthName,
    };
  }, [logements, interventions]);

  // Missions du JOUR uniquement
  const todayMissions = interventions
    .filter((i) => i.date === today)
    .sort((a, b) => {
      const order: Record<string, number> = { en_cours: 0, acceptee: 1, assignee: 2, a_attribuer: 3, terminee: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoadingLogements || isLoadingInterventions) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* Header accueillant */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Bonjour, {profile?.full_name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Stats cards - design moderne avec dégradés */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/client/logements')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-blue-600 font-medium">Logements</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.logements}</p>
        </div>

        <div
          className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/client/interventions')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-amber-600 font-medium">Interventions</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.interventionsMois}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-green-600 font-medium capitalize">Terminées</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.completedMonth}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-sm text-white">🧺</span>
            </div>
            <span className="text-xs text-indigo-600 font-medium">Blanchisserie</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{stats.totalBlanchisserie.toFixed(0)}€</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Euro className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-purple-600 font-medium capitalize">Facture</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.factureMonth.toFixed(0)}€</p>
        </div>
      </div>

      {/* Missions du jour */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Missions du jour
          </h2>
        </div>

        <div className="p-4">
          {todayMissions.length === 0 ? (
            <div className="text-center py-6">
              <EmptyState
                icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
                title="Aucune intervention aujourd'hui"
                description="Vous n'avez pas d'intervention programmée pour aujourd'hui."
              />
              <Link
                to="/client/calendrier"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
              >
                <Calendar className="w-4 h-4" />
                Voir le calendrier
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMissions.map((intervention) => {
                const clientStatus = getClientStatus(intervention.status);
                return (
                  <div
                    key={intervention.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 hover:shadow-sm cursor-pointer transition-all border border-gray-100"
                    onClick={() => setSelectedMission(intervention as InterventionWithRelations)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {intervention.logement?.name}
                          </span>
                          <ClientStatusBadge status={clientStatus} />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {intervention.logement?.address}, {intervention.logement?.city}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                          <span className="bg-gray-200 px-2 py-0.5 rounded-full">{InterventionTypeLabels[intervention.type]}</span>
                          {intervention.blanchisserie_incluse && (
                            <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">🧺 Blanchisserie</span>
                          )}
                        </div>
                      </div>
                      {intervention.status === 'terminee' && intervention.rapport && (
                        <div className="flex items-center gap-1 text-green-600 text-xs flex-shrink-0 bg-green-50 px-2 py-1 rounded-full">
                          <FileText className="w-3.5 h-3.5" />
                          Rapport
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <Link
                to="/client/calendrier"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
              >
                Voir le calendrier complet
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail mission */}
      <Modal
        isOpen={selectedMission !== null}
        onClose={() => setSelectedMission(null)}
        title="Détail de la mission"
        size="lg"
      >
        {selectedMission && (
          <div className="space-y-4">
            {/* Logement */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900">
                {selectedMission.logement?.name}
              </h3>
              <p className="text-sm text-blue-700 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {selectedMission.logement?.address}, {selectedMission.logement?.city}
              </p>
            </div>

            {/* Infos principales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="font-medium text-sm">{formatDate(selectedMission.date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Statut</p>
                <ClientStatusBadge status={getClientStatus(selectedMission.status)} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="font-medium text-sm">{InterventionTypeLabels[selectedMission.type]}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Voyageurs</p>
                <p className="font-medium text-sm">{selectedMission.nb_voyageurs}</p>
              </div>
            </div>

            {selectedMission.prestataire && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Prestataire</p>
                <p className="font-medium text-sm">{selectedMission.prestataire.full_name}</p>
              </div>
            )}

            {/* Facturation détaillée */}
            {selectedMission.status === 'terminee' && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
                <p className="text-sm font-semibold text-purple-700">Facturation</p>
                {selectedMission.prix_client_ttc ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ménage</span>
                    <span className="font-medium">{selectedMission.prix_client_ttc.toFixed(2)}€</span>
                  </div>
                ) : null}
                {selectedMission.blanchisserie_incluse && selectedMission.prix_blanchisserie ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blanchisserie</span>
                    <span className="font-medium">{selectedMission.prix_blanchisserie.toFixed(2)}€</span>
                  </div>
                ) : null}
                <div className="border-t border-purple-200 pt-2 flex justify-between">
                  <span className="font-semibold text-purple-700">Total</span>
                  <span className="text-xl font-bold text-purple-900">
                    {((selectedMission.prix_client_ttc || 0) + (selectedMission.blanchisserie_incluse ? (selectedMission.prix_blanchisserie || 0) : 0)).toFixed(2)}€
                  </span>
                </div>
              </div>
            )}

            {selectedMission.special_instructions && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-1">Instructions spéciales</p>
                <p className="text-sm text-gray-700">{selectedMission.special_instructions}</p>
              </div>
            )}

            {/* Photos état des lieux */}
            {selectedMission.photos_etat_lieux && selectedMission.photos_etat_lieux.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-500" />
                  État des lieux (avant ménage)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {selectedMission.photos_etat_lieux.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`État des lieux ${index + 1}`}
                      onClick={() => openLightbox(selectedMission.photos_etat_lieux!, index)}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rapport */}
            {selectedMission.rapport && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Rapport de fin d'intervention
                </h4>

                {selectedMission.rapport.photos_intervention.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      Photos après ménage
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedMission.rapport.photos_intervention.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          onClick={() => openLightbox(selectedMission.rapport!.photos_intervention, index)}
                          className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedMission.rapport.degats_signales && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-medium text-red-700 mb-2">⚠️ Dégâts signalés</p>
                    <p className="text-red-600 text-sm">{selectedMission.rapport.degats_description}</p>
                    {selectedMission.rapport.degats_photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {selectedMission.rapport.degats_photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Dégât ${index + 1}`}
                            onClick={() => openLightbox(selectedMission.rapport!.degats_photos, index)}
                            className="w-full aspect-square object-cover rounded-lg border-2 border-red-300 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message si pas terminée */}
            {selectedMission.status !== 'terminee' && (
              <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm">
                Le rapport sera disponible après l'intervention
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox pour les photos */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
