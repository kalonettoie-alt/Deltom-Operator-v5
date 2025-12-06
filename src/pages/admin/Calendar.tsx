import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useLogements } from '../../hooks/useLogements';
import { useClients, usePrestataires } from '../../hooks/useProfiles';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { InterventionWithRelations } from '../../types';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function AdminCalendar() {
  const navigate = useNavigate();
  const { interventions, isLoading } = useInterventions({ withRelations: true });
  const { logements } = useLogements({ withClient: true });
  const { clients } = useClients();
  const { prestataires } = usePrestataires();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filtres
  const [logementFilter, setLogementFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [prestataireFilter, setPrestataireFilter] = useState('');

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        <p className="text-gray-600 mt-1">Vue mensuelle des interventions</p>
      </div>

      {/* Filtres */}
      <div className="card mb-6">
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
              {filteredInterventions.length} intervention(s) affichée(s)
            </p>
            <button
              onClick={() => {
                setLogementFilter('');
                setClientFilter('');
                setPrestataireFilter('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={goToToday} className="btn-secondary text-sm">
              Aujourd'hui
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, index) => {
              const interventionsForDay = item.date ? interventionsByDate[item.date] || [] : [];
              const hasInterventions = interventionsForDay.length > 0;
              const isSelected = item.date === selectedDate;

              return (
                <div
                  key={index}
                  onClick={() => item.date && setSelectedDate(item.date)}
                  className={`
                    min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${item.day === null ? 'bg-gray-50 cursor-default' : 'hover:bg-gray-50'}
                    ${isToday(item.date) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}
                    ${isSelected ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  {item.day && (
                    <>
                      <span className={`text-sm font-medium ${isToday(item.date) ? 'text-primary-700' : 'text-gray-900'}`}>
                        {item.day}
                      </span>
                      {hasInterventions && (
                        <div className="mt-1 space-y-1">
                          {interventionsForDay.slice(0, 2).map((intervention) => (
                            <div key={intervention.id} className="text-xs truncate px-1 py-0.5 rounded bg-primary-100 text-primary-700">
                              {intervention.logement?.name}
                            </div>
                          ))}
                          {interventionsForDay.length > 2 && (
                            <div className="text-xs text-gray-500">+{interventionsForDay.length - 2} autre(s)</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'Sélectionnez un jour'}
          </h3>

          {!selectedDate ? (
            <p className="text-gray-500 text-sm">Cliquez sur un jour pour voir les interventions prévues.</p>
          ) : selectedInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune intervention prévue ce jour.</p>
          ) : (
            <div className="space-y-3">
              {selectedInterventions.map((intervention) => (
                <div
                  key={intervention.id}
                  onClick={() => navigate(`/admin/interventions/${intervention.id}`)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{intervention.logement?.name}</span>
                    <StatusBadge status={intervention.status} />
                  </div>
                  <p className="text-sm text-gray-600">{intervention.logement?.city}</p>
                  {intervention.prestataire ? (
                    <p className="text-sm text-gray-500 mt-1">{intervention.prestataire.full_name}</p>
                  ) : (
                    <p className="text-sm text-orange-600 mt-1 font-medium">Non assigné</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
