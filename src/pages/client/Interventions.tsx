import { useState } from 'react';
import { ClipboardList, Search, Filter, FileText, Clock, Camera, Image } from 'lucide-react';
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

  // Filtrer les interventions avec les statuts simplifiés
  const filteredInterventions = interventions.filter((i) => {
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
    return new Date(dateStr).toLocaleDateString('fr-FR', {
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mes interventions</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">{interventions.length} intervention(s)</p>
      </div>

      {/* Filtres */}
      {interventions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par logement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ClientStatus | '')}
                className="input-field pl-10"
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
      )}

      {/* Liste des interventions */}
      {interventions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
          title="Aucune intervention"
          description="Vous n'avez pas encore d'intervention programmée."
        />
      ) : filteredInterventions.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucune intervention ne correspond à vos critères."
        />
      ) : (
        <div className="grid gap-3 md:gap-4">
          {sortedInterventions.map((intervention) => (
            <div
              key={intervention.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedIntervention(intervention)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                    <span className="text-sm md:text-base font-medium text-gray-900">{formatDate(intervention.date)}</span>
                    <ClientStatusBadge status={getClientStatus(intervention.status)} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base">{intervention.logement?.name}</h3>
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    {intervention.logement?.address}, {intervention.logement?.city}
                  </p>
                  <div className="flex items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-500 flex-wrap">
                    <span>{InterventionTypeLabels[intervention.type]}</span>
                    <span>{intervention.nb_voyageurs} voyageurs</span>
                  </div>
                </div>
                {intervention.status === 'terminee' && intervention.rapport && (
                  <div className="flex items-center gap-1 text-green-600 text-xs md:text-sm flex-shrink-0">
                    <FileText className="w-4 h-4" />
                    Rapport disponible
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
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {selectedIntervention.logement?.name}
              </h3>
              <p className="text-gray-600">
                {selectedIntervention.logement?.address}, {selectedIntervention.logement?.city}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(selectedIntervention.date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <ClientStatusBadge status={getClientStatus(selectedIntervention.status)} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{InterventionTypeLabels[selectedIntervention.type]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Voyageurs</p>
                <p className="font-medium">{selectedIntervention.nb_voyageurs}</p>
              </div>
            </div>

            {selectedIntervention.prestataire && (
              <div>
                <p className="text-sm text-gray-500">Prestataire</p>
                <p className="font-medium">{selectedIntervention.prestataire.full_name}</p>
              </div>
            )}

            {selectedIntervention.status === 'terminee' && selectedIntervention.prix_client_ttc && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-600">Montant facturé</p>
                <p className="text-xl font-bold text-purple-900">{selectedIntervention.prix_client_ttc.toFixed(2)}€ TTC</p>
              </div>
            )}

            {/* Temps de nettoyage */}
            {selectedIntervention.started_at && selectedIntervention.completed_at && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Temps de nettoyage</p>
                  <p className="font-medium text-gray-900">
                    {(() => {
                      const start = new Date(selectedIntervention.started_at!);
                      const end = new Date(selectedIntervention.completed_at!);
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
              </div>
            )}

            {selectedIntervention.special_instructions && (
              <div>
                <p className="text-sm text-gray-500">Instructions spéciales</p>
                <p className="text-gray-700">{selectedIntervention.special_instructions}</p>
              </div>
            )}

            {/* Photos état des lieux (avant intervention) */}
            {selectedIntervention.photos_etat_lieux && selectedIntervention.photos_etat_lieux.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
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
                  <FileText className="w-5 h-5" />
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
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-700 mb-2">⚠️ Dégâts signalés</p>
                    <p className="text-red-600">{selectedIntervention.rapport.degats_description}</p>
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
