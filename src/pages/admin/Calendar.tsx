import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Zap, Plus } from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useLogements } from '../../hooks/useLogements';
import { useClients, usePrestataires } from '../../hooks/useProfiles';
import { useFilters } from '../../hooks/useFilters';
import { Modal } from '../../components/ui/Modal';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { InterventionForm } from '../../components/forms/InterventionForm';
import type { InterventionWithRelations, InterventionInsert } from '../../types';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

export function AdminCalendar() {
  const navigate = useNavigate();
  const { interventions, isLoading, createIntervention } = useInterventions({ withRelations: true });
  const { logements, isLoading: isLoadingLogements } = useLogements({ withClient: true });
  const { clients } = useClients();
  const { prestataires, isLoading: isLoadingPrestataires } = usePrestataires();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Modale nouvelle intervention
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtres persistés via localStorage (partagés avec Interventions)
  const { filters, updateFilter, resetFilters: resetAllFilters } = useFilters('admin_interventions');
  const logementFilter = filters.logement;
  const clientFilter = filters.client;
  const prestataireFilter = filters.prestataire;
  const setLogementFilter = (v: string) => updateFilter('logement', v);
  const setClientFilter = (v: string) => updateFilter('client', v);
  const setPrestataireFilter = (v: string) => updateFilter('prestataire', v);

  // Obtenir le premier jour du mois et le nombre de jours
  const { firstDayOfMonth, daysInMonth, year, month } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    let firstDay = first.getDay() - 1;
    if (firstDay < 0) firstDay = 6;
    return { firstDayOfMonth: firstDay, daysInMonth: days, year: y, month: m };
  }, [currentDate]);

  // Filtrer les interventions
  const filteredInterventions = useMemo(() => {
    return interventions.filter((i) => {
      const matchesLogement = !logementFilter || i.logement_id === logementFilter;
      const matchesClient = !clientFilter || i.client_id === clientFilter;
      const matchesPrestataire = !prestataireFilter || i.prestataire_id === prestataireFilter;
      return matchesLogement && matchesClient && matchesPrestataire;
    });
  }, [interventions, logementFilter, clientFilter, prestataireFilter]);

  // Grouper les interventions par date
  const interventionsByDate = useMemo(() => {
    const grouped: Record<string, InterventionWithRelations[]> = {};
    filteredInterventions.forEach((intervention) => {
      if (!grouped[intervention.date]) {
        grouped[intervention.date] = [];
      }
      grouped[intervention.date].push(intervention);
    });
    return grouped;
  }, [filteredInterventions]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, date: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr });
    }
    return days;
  }, [firstDayOfMonth, daysInMonth, year, month]);

  const selectedInterventions = selectedDate ? interventionsByDate[selectedDate] || [] : [];

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const hasActiveFilters = logementFilter || clientFilter || prestataireFilter;

  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return `${DAYS_FULL[dayIndex]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  const handleAddIntervention = () => {
    setIsModalOpen(true);
  };

  const handleCreateIntervention = async (data: InterventionInsert) => {
    setIsSubmitting(true);
    try {
      const { error } = await createIntervention(data);
      if (error) {
        alert(error);
        return;
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Vue mensuelle des interventions</p>
        </div>
        <button onClick={handleAddIntervention} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle mission</span>
          <span className="sm:hidden">Nouvelle</span>
        </button>
      </div>

      {/* Bouton Filtres (mobile) */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="md:hidden w-full mb-4 btn-secondary flex items-center justify-center gap-2"
      >
        <Filter className="w-4 h-4" />
        Filtres {hasActiveFilters && `(${[logementFilter, clientFilter, prestataireFilter].filter(Boolean).length})`}
      </button>

      {/* Filtres */}
      <div className={`card mb-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4" />
          Filtres
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logement</label>
            <select
              value={logementFilter}
              onChange={(e) => setLogementFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Tous les logements</option>
              {logements.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} - {l.city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prestataire</label>
            <select
              value={prestataireFilter}
              onChange={(e) => setPrestataireFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Tous les prestataires</option>
              {prestataires.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredInterventions.length} intervention(s) affichee(s)
            </p>
            <button
              onClick={() => {
                setLogementFilter('');
                setClientFilter('');
                setPrestataireFilter('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Reinitialiser filtres
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendrier */}
        <div className="lg:col-span-2 card">
          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-1 md:gap-2">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 min-w-[140px] md:min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={goToToday} className="btn-secondary text-xs md:text-sm">
              Aujourd'hui
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs md:text-sm font-medium text-gray-500 py-1 md:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, index) => {
              const interventionsForDay = item.date ? interventionsByDate[item.date] || [] : [];
              const hasInterventions = interventionsForDay.length > 0;
              const isSelected = item.date === selectedDate;

              return (
                <button
                  key={index}
                  onClick={() => item.date && setSelectedDate(item.date)}
                  disabled={item.day === null}
                  className={`
                    min-h-[60px] md:min-h-[80px] p-1 md:p-2 border rounded-lg transition-all text-left
                    ${item.day === null ? 'bg-gray-50 cursor-default border-transparent' : 'hover:bg-gray-50 border-gray-200'}
                    ${isToday(item.date) ? 'border-primary-500 border-2 bg-primary-50' : ''}
                    ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''}
                  `}
                >
                  {item.day && (
                    <>
                      <span className={`text-xs md:text-sm font-medium ${isToday(item.date) ? 'text-primary-700' : 'text-gray-900'}`}>
                        {item.day}
                      </span>
                      {hasInterventions && (
                        <div className="mt-1">
                          {/* Mobile: juste un indicateur */}
                          <div className="flex items-center gap-1 md:hidden">
                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                            <span className="text-xs text-gray-600">{interventionsForDay.length}</span>
                          </div>
                          {/* Desktop: apercu */}
                          <div className="hidden md:block space-y-1">
                            {interventionsForDay.slice(0, 2).map((intervention) => (
                              <div key={intervention.id} className="text-xs truncate px-1 py-0.5 rounded bg-primary-100 text-primary-700">
                                {intervention.logement?.name}
                              </div>
                            ))}
                            {interventionsForDay.length > 2 && (
                              <div className="text-xs text-gray-500">+{interventionsForDay.length - 2} autre(s)</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste des interventions du jour selectionne - Desktop uniquement */}
        <div className="hidden lg:block card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              {selectedDate
                ? formatSelectedDate(selectedDate)
                : 'Selectionnez un jour'}
            </h3>
            {selectedDate && (
              <button
                onClick={handleAddIntervention}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            )}
          </div>

          {!selectedDate ? (
            <p className="text-gray-500 text-sm">Cliquez sur un jour pour voir les interventions prevues.</p>
          ) : selectedInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune intervention prevue ce jour.</p>
          ) : (
            <div className="space-y-3">
              {selectedInterventions.map((intervention) => (
                <div
                  key={intervention.id}
                  onClick={() => navigate(`/admin/interventions/${intervention.id}`)}
                  className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span className="font-medium text-gray-900">{intervention.logement?.name}</span>
                    <StatusBadge status={intervention.status} />
                  </div>
                  {intervention.checkin_meme_jour && (
                    <div className="flex items-center gap-1 mb-2 text-orange-600 text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      Check-in meme jour
                    </div>
                  )}
                  <p className="text-sm text-gray-600">{intervention.logement?.city}</p>
                  {intervention.prestataire ? (
                    <p className="text-sm text-gray-500 mt-1">{intervention.prestataire.full_name}</p>
                  ) : (
                    <p className="text-sm text-orange-600 mt-1 font-medium">Non assigne</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vue liste mobile quand un jour est selectionne */}
      {selectedDate && selectedInterventions.length > 0 && (
        <div className="mt-4 lg:hidden card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {formatSelectedDate(selectedDate)}
            </h3>
            <button
              onClick={handleAddIntervention}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {selectedInterventions.map((intervention) => (
              <div
                key={intervention.id}
                onClick={() => navigate(`/admin/interventions/${intervention.id}`)}
                className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div>
                    <p className="font-medium">{intervention.logement?.name}</p>
                    <p className="text-sm text-gray-600">{intervention.logement?.city}</p>
                    {intervention.checkin_meme_jour && (
                      <div className="flex items-center gap-1 mt-1 text-orange-600 text-xs font-medium">
                        <Zap className="w-3 h-3" />
                        Check-in meme jour
                      </div>
                    )}
                  </div>
                  <StatusBadge status={intervention.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de création d'intervention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle intervention"
        size="lg"
      >
        {isLoadingLogements || isLoadingPrestataires ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <InterventionForm
            logements={logements}
            prestataires={prestataires}
            onSubmit={handleCreateIntervention}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={isSubmitting}
            prefilledDate={selectedDate || undefined}
            prefilledLogement={logementFilter || undefined}
          />
        )}
      </Modal>
    </div>
  );
}
