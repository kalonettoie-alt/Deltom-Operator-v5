import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, Filter, FileText, Camera, Image, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { InterventionTypeLabels, getClientStatus, ClientStatusLabels } from '../../types';
import type { InterventionWithRelations } from '../../types';

// Statuts simplifiés côté client
type ClientStatus = 'a_venir' | 'en_cours' | 'terminee';

// Badge de statut simplifié pour les clients
function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const colors: Record<ClientStatus, string> = {
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

export function ClientInterventions() {
  const { profile } = useAuth();
  const { interventions, isLoading } = useInterventions({
    clientId: profile?.id,
    withRelations: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionWithRelations | null>(null);

  // Pour le lightbox des photos
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  // Mois en cours
  const currentMonthInfo = useMemo(() => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return { startOfMonth, endOfMonthStr, monthName };
  }, []);

  // Filtrer les interventions du mois en cours avec les statuts simplifiés
  const filteredInterventions = interventions.filter((i) => {
    const isCurrentMonth = i.date >= currentMonthInfo.startOfMonth && i.date <= currentMonthInfo.endOfMonthStr;
    if (!isCurrentMonth) return false;

    const matchesSearch = i.logement?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const clientStatus = getClientStatus(i.status);
    const matchesStatus = !statusFilter || clientStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Trier par date (plus récentes d'abord)
  const sortedInterventions = [...filteredInterventions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

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
          <ClipboardList className="w-6 h-6 text-amber-500" />
          Mes interventions
        </h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="capitalize">{currentMonthInfo.monthName}</span>
          <span className="text-gray-300">•</span>
          <span>{filteredInterventions.length} intervention(s)</span>
        </p>
        <Link
          to="/client/historique"
          className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
        >
          Voir l'historique des mois precedents
        </Link>
      </div>

      {/* Filtres compacts */}
      {interventions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un logement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ClientStatus | '')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(ClientStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des interventions */}
      {filteredInterventions.length === 0 && !searchTerm && !statusFilter ? (
        <div className="text-center">
          <EmptyState
            icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
            title="Aucune intervention ce mois"
            description={`Vous n'avez pas d'intervention programmée pour ${currentMonthInfo.monthName}.`}
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            <Link
              to="/client/calendrier"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Voir le calendrier
            </Link>
            <Link
              to="/client/historique"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voir l'historique
            </Link>
          </div>
        </div>
      ) : filteredInterventions.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucune intervention ne correspond à vos critères."
        />
      ) : (
        <div className="space-y-3">
          {sortedInterventions.map((intervention) => (
            <div
              key={intervention.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedIntervention(intervention)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{formatDate(intervention.date)}</span>
                    <ClientStatusBadge status={getClientStatus(intervention.status)} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{intervention.logement?.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {intervention.logement?.address}, {intervention.logement?.city}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{InterventionTypeLabels[intervention.type]}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{intervention.nb_voyageurs} voyageurs</span>
                    {intervention.blanchisserie_incluse && (
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">🧺 Blanchisserie</span>
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
          ))}
        </div>
      )}

      {/* Modal de détail */}
      <Modal
        isOpen={selectedIntervention !== null}
        onClose={() => setSelectedIntervention(null)}
        title="Détail de l'intervention"
        size="lg"
      >
        {selectedIntervention && (
          <div className="space-y-4">
            {/* Logement */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900">
                {selectedIntervention.logement?.name}
              </h3>
              <p className="text-sm text-blue-700 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {selectedIntervention.logement?.address}, {selectedIntervention.logement?.city}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="font-medium text-sm">{formatDate(selectedIntervention.date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Statut</p>
                <ClientStatusBadge status={getClientStatus(selectedIntervention.status)} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="font-medium text-sm">{InterventionTypeLabels[selectedIntervention.type]}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Voyageurs</p>
                <p className="font-medium text-sm">{selectedIntervention.nb_voyageurs}</p>
              </div>
            </div>

            {selectedIntervention.prestataire && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Prestataire</p>
                <p className="font-medium text-sm">{selectedIntervention.prestataire.full_name}</p>
              </div>
            )}

            {selectedIntervention.status === 'terminee' && selectedIntervention.prix_client_ttc && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
                <p className="text-sm font-semibold text-purple-700">Facturation</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ménage</span>
                  <span className="font-medium">{selectedIntervention.prix_client_ttc.toFixed(2)}€</span>
                </div>
                {selectedIntervention.blanchisserie_incluse && selectedIntervention.prix_blanchisserie ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blanchisserie</span>
                    <span className="font-medium">{selectedIntervention.prix_blanchisserie.toFixed(2)}€</span>
                  </div>
                ) : null}
                <div className="border-t border-purple-200 pt-2 flex justify-between">
                  <span className="font-semibold text-purple-700">Total</span>
                  <span className="text-xl font-bold text-purple-900">
                    {((selectedIntervention.prix_client_ttc || 0) + (selectedIntervention.blanchisserie_incluse ? (selectedIntervention.prix_blanchisserie || 0) : 0)).toFixed(2)}€ TTC
                  </span>
                </div>
              </div>
            )}

            {selectedIntervention.special_instructions && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-1">Instructions spéciales</p>
                <p className="text-sm text-gray-700">{selectedIntervention.special_instructions}</p>
              </div>
            )}

            {/* Photos état des lieux (avant intervention) */}
            {selectedIntervention.photos_etat_lieux && selectedIntervention.photos_etat_lieux.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-500" />
                  État des lieux (avant ménage)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {selectedIntervention.photos_etat_lieux.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`État des lieux ${index + 1}`}
                      onClick={() => openLightbox(selectedIntervention.photos_etat_lieux!, index)}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rapport */}
            {selectedIntervention.rapport && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Rapport de fin d'intervention
                </h4>

                {selectedIntervention.rapport.photos_intervention.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      Photos après ménage
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedIntervention.rapport.photos_intervention.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          onClick={() => openLightbox(selectedIntervention.rapport!.photos_intervention, index)}
                          className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedIntervention.rapport.degats_signales && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-medium text-red-700 mb-2">⚠️ Dégâts signalés</p>
                    <p className="text-red-600 text-sm">{selectedIntervention.rapport.degats_description}</p>
                    {selectedIntervention.rapport.degats_photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {selectedIntervention.rapport.degats_photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Dégât ${index + 1}`}
                            onClick={() => openLightbox(selectedIntervention.rapport!.degats_photos, index)}
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
            {selectedIntervention.status !== 'terminee' && (
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
