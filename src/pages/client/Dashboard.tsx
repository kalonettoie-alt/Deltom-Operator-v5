import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogements } from '../../hooks/useLogements';
import { useInterventions } from '../../hooks/useInterventions';
import { Building2, ClipboardList, CheckCircle, Euro, Calendar, FileText, Camera, Image, MapPin } from 'lucide-react';
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
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

    // Interventions du mois (toutes, pas seulement terminées)
    const interventionsMois = interventions.filter(
      (i) => i.date >= startOfMonthStr && i.date <= endOfMonthStr
    );

    // Interventions terminées ce mois
    const completedThisMonth = interventions.filter(
      (i) => i.date >= startOfMonthStr && i.status === 'terminee'
    );

    // Facture du mois (somme des prix client TTC des interventions terminées du mois)
    const factureMonth = completedThisMonth.reduce(
      (sum, i) => sum + (i.prix_client_ttc || 0),
      0
    );

    // Blanchisserie du mois
    // 1. Blanchisserie incluse dans les interventions terminées du mois
    const blanchisserieInterventions = completedThisMonth
      .filter((i) => i.blanchisserie_incluse)
      .reduce((sum, i) => sum + (i.prix_blanchisserie || 0), 0);

    // 2. Forfaits blanchisserie des logements (mensuel)
    const forfaitsBlanchisserie = logements
      .filter((l) => l.type_blanchisserie === 'forfait' && l.prix_blanchisserie)
      .reduce((sum, l) => sum + (l.prix_blanchisserie || 0), 0);

    const totalBlanchisserie = blanchisserieInterventions + forfaitsBlanchisserie;

    // Nom du mois en cours
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
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Bonjour, {profile?.full_name}
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Suivez vos logements et interventions</p>
      </div>

      {/* Stats cards - 5 colonnes desktop */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/client/logements')}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-blue-100 rounded-xl">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Logements</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.logements}</p>
            </div>
          </div>
        </div>

        <div
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/client/interventions')}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-yellow-100 rounded-xl">
              <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 capitalize">Interventions</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.interventionsMois}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 capitalize">Terminées ({stats.currentMonthName})</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.completedMonth}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-indigo-200 rounded-xl">
              <span className="text-lg">🧺</span>
            </div>
            <div>
              <p className="text-xs md:text-sm text-indigo-600">Blanchisserie</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-900">{stats.totalBlanchisserie.toFixed(0)}€</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-purple-200 rounded-xl">
              <Euro className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-purple-600 capitalize">Facture ({stats.currentMonthName})</p>
              <p className="text-lg md:text-2xl font-bold text-purple-900">{stats.factureMonth.toFixed(0)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Missions du jour */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Missions du jour
        </h2>

        {todayMissions.length === 0 ? (
          <div className="text-center py-6">
            <EmptyState
              icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
              title="Aucune intervention aujourd'hui"
              description="Vous n'avez pas d'intervention programmée pour aujourd'hui."
            />
            <Link
              to="/client/calendrier"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
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
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedMission(intervention as InterventionWithRelations)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {intervention.logement?.name}
                        </span>
                        <ClientStatusBadge status={clientStatus} />
                      </div>
                      <p className="text-sm text-gray-600">
                        {intervention.logement?.address}, {intervention.logement?.city}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{InterventionTypeLabels[intervention.type]}</span>
                        {intervention.blanchisserie_incluse && (
                          <span className="text-indigo-600">🧺 Blanchisserie incluse</span>
                        )}
                      </div>
                    </div>
                    {intervention.status === 'terminee' && intervention.rapport && (
                      <div className="flex items-center gap-1 text-green-600 text-xs flex-shrink-0">
                        <FileText className="w-4 h-4" />
                        Rapport
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <Link
              to="/client/calendrier"
              className="block text-center text-sm text-primary-600 hover:text-primary-700 pt-2"
            >
              Voir le calendrier complet
            </Link>
          </div>
        )}
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
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {selectedMission.logement?.name}
              </h3>
              <p className="text-gray-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {selectedMission.logement?.address}, {selectedMission.logement?.city}
              </p>
            </div>

            {/* Infos principales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(selectedMission.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <ClientStatusBadge status={getClientStatus(selectedMission.status)} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{InterventionTypeLabels[selectedMission.type]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Voyageurs</p>
                <p className="font-medium">{selectedMission.nb_voyageurs}</p>
              </div>
            </div>

            {selectedMission.prestataire && (
              <div>
                <p className="text-sm text-gray-500">Prestataire</p>
                <p className="font-medium">{selectedMission.prestataire.full_name}</p>
              </div>
            )}

            {/* Facturation détaillée */}
            {selectedMission.status === 'terminee' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
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
              <div>
                <p className="text-sm text-gray-500">Instructions spéciales</p>
                <p className="text-gray-700">{selectedMission.special_instructions}</p>
              </div>
            )}

            {/* Photos état des lieux */}
            {selectedMission.photos_etat_lieux && selectedMission.photos_etat_lieux.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
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
                  <FileText className="w-5 h-5" />
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
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-700 mb-2">⚠️ Dégâts signalés</p>
                    <p className="text-red-600">{selectedMission.rapport.degats_description}</p>
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
