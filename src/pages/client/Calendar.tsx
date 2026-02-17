import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { ChevronLeft, ChevronRight, MapPin, Calendar as CalendarIcon, FileText, Camera, Image } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { getClientStatus, ClientStatusLabels, InterventionTypeLabels } from '../../types';
import type { InterventionWithRelations } from '../../types';

// Helper pour formater une date en YYYY-MM-DD sans probleme de timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Badge de statut simplifie pour les clients
function ClientStatusBadge({ status }: { status: 'a_venir' | 'en_cours' | 'terminee' }) {
  const colors: Record<string, string> = {
    a_venir: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-purple-100 text-purple-700',
    terminee: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${colors[status]}`}>
      {ClientStatusLabels[status]}
    </span>
  );
}

export function ClientCalendar() {
  const { profile } = useAuth();
  const { interventions, isLoading } = useInterventions({
    clientId: profile?.id,
    withRelations: true,
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateLocal(new Date()));
  };

  // Filtrer les interventions du mois en cours
  const monthInterventions = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endOfMonth = formatDateLocal(new Date(year, month + 1, 0));

    return interventions.filter((i) => i.date >= startOfMonth && i.date <= endOfMonth);
  }, [interventions, currentDate]);

  // Generer les jours du calendrier
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7; // Lundi = 0

    const days: (string | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(formatDateLocal(new Date(year, month, i)));
    }

    return days;
  }, [currentDate]);

  // Interventions pour un jour donne
  const getInterventionsForDay = (dateStr: string) => {
    return monthInterventions.filter((i) => i.date === dateStr);
  };

  // Interventions du jour selectionne
  const selectedDayInterventions = selectedDate ? getInterventionsForDay(selectedDate) : [];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const todayStr = formatDateLocal(new Date());

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-500" />
          Calendrier
        </h1>
        <p className="text-sm text-gray-500 mt-1">Vos interventions programmees</p>
      </div>

      {/* Navigation mois */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-bold capitalize">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="w-full mt-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {weekDays.map((day) => (
            <div key={day} className="py-2.5 text-center text-xs font-semibold text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Jours */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dateStr, index) => {
            if (!dateStr) {
              return <div key={index} className="h-16 border-t border-l border-gray-50" />;
            }

            const dayInterventions = getInterventionsForDay(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const dayNum = parseInt(dateStr.split('-')[2], 10);

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-16 border-t border-l border-gray-50 p-1 text-left hover:bg-blue-50 transition-colors ${
                  isSelected ? 'bg-blue-50 ring-1 ring-blue-200 ring-inset' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center ${
                    isToday
                      ? 'bg-blue-500 text-white rounded-full w-6 h-6'
                      : 'text-gray-700'
                  }`}
                >
                  {dayNum}
                </span>

                {dayInterventions.slice(0, 2).map((intervention, i) => {
                  const clientStatus = getClientStatus(intervention.status);
                  return (
                    <div
                      key={i}
                      className={`text-xs truncate rounded px-1 mt-0.5 ${
                        clientStatus === 'terminee'
                          ? 'bg-green-100 text-green-700'
                          : clientStatus === 'en_cours'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {intervention.logement?.name?.substring(0, 8)}...
                    </div>
                  );
                })}

                {dayInterventions.length > 2 && (
                  <p className="text-xs text-gray-400">+{dayInterventions.length - 2}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail du jour selectionne */}
      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
          </div>

          <div className="p-4">
            {selectedDayInterventions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucune intervention ce jour</p>
            ) : (
              <div className="space-y-2">
                {selectedDayInterventions.map((intervention) => {
                  const clientStatus = getClientStatus(intervention.status);
                  return (
                    <button
                      key={intervention.id}
                      onClick={() => setSelectedIntervention(intervention as InterventionWithRelations)}
                      className="w-full p-3 bg-gray-50 rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all text-left border border-gray-100"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{intervention.logement?.name}</p>
                            <ClientStatusBadge status={clientStatus} />
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {intervention.logement?.address}, {intervention.logement?.city}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs">
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{InterventionTypeLabels[intervention.type]}</span>
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

                      {intervention.status === 'terminee' && intervention.rapport && (
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          Cliquez pour voir le rapport
                        </p>
                      )}
                      {intervention.status !== 'terminee' && (
                        <p className="text-xs text-gray-400 mt-2">
                          Cliquez pour voir le détail
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal détail intervention / rapport */}
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

            {/* Infos */}
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

            {/* Facturation */}
            {selectedIntervention.status === 'terminee' && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
                <p className="text-sm font-semibold text-purple-700">Facturation</p>
                {selectedIntervention.prix_client_ttc ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ménage</span>
                    <span className="font-medium">{selectedIntervention.prix_client_ttc.toFixed(2)}€</span>
                  </div>
                ) : null}
                {selectedIntervention.blanchisserie_incluse && selectedIntervention.prix_blanchisserie ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blanchisserie</span>
                    <span className="font-medium">{selectedIntervention.prix_blanchisserie.toFixed(2)}€</span>
                  </div>
                ) : null}
                <div className="border-t border-purple-200 pt-2 flex justify-between">
                  <span className="font-semibold text-purple-700">Total</span>
                  <span className="text-xl font-bold text-purple-900">
                    {((selectedIntervention.prix_client_ttc || 0) + (selectedIntervention.blanchisserie_incluse ? (selectedIntervention.prix_blanchisserie || 0) : 0)).toFixed(2)}€
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

            {/* Photos état des lieux */}
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
                      Photos après ménage ({selectedIntervention.rapport.photos_intervention.length})
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
