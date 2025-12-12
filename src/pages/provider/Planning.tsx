import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { Loader } from '../../components/ui/Loader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { InterventionWithRelations } from '../../types';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function ProviderPlanning() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { interventions, isLoading } = useInterventions({
    prestataireId: profile?.id,
    withRelations: true,
  });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);

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

  // Grouper les interventions par date
  const interventionsByDate = useMemo(() => {
    const grouped: Record<string, InterventionWithRelations[]> = {};
    interventions.forEach((intervention) => {
      if (!grouped[intervention.date]) {
        grouped[intervention.date] = [];
      }
      grouped[intervention.date].push(intervention);
    });
    return grouped;
  }, [interventions]);

  // Navigation mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  // Générer les jours du calendrier
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

  // Interventions du jour sélectionné
  const selectedInterventions = selectedDate ? interventionsByDate[selectedDate] || [] : [];

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    return dateStr === todayStr;
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mon planning</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Vue mensuelle de vos missions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendrier */}
        <div className="lg:col-span-2 card">
          {/* Header du calendrier */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 min-w-[140px] md:min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
              <div
                key={day}
                className="text-center text-xs md:text-sm font-medium text-gray-500 py-1 md:py-2"
              >
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
                <div
                  key={index}
                  onClick={() => item.date && setSelectedDate(item.date)}
                  className={`
                    min-h-[60px] md:min-h-[80px] p-1 md:p-2 border rounded-lg cursor-pointer transition-colors
                    ${item.day === null ? 'bg-gray-50 cursor-default border-transparent' : 'hover:bg-gray-50 border-gray-200'}
                    ${isToday(item.date) ? 'border-primary-500 border-2 bg-primary-50' : ''}
                    ${isSelected ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  {item.day && (
                    <>
                      <span
                        className={`text-xs md:text-sm font-medium ${
                          isToday(item.date) ? 'text-primary-700' : 'text-gray-900'
                        }`}
                      >
                        {item.day}
                      </span>
                      {hasInterventions && (
                        <div className="mt-1">
                          {/* Mobile: juste un indicateur */}
                          <div className="flex items-center gap-1 md:hidden justify-center">
                            <span className="w-2 h-2 rounded-full bg-primary-500" />
                            <span className="text-xs text-gray-600">{interventionsForDay.length}</span>
                          </div>
                          {/* Desktop: point + nombre si > 1 */}
                          <div className="hidden md:block">
                            <div className="w-2 h-2 rounded-full bg-primary-500 mx-auto" />
                            {interventionsForDay.length > 1 && (
                              <p className="text-xs text-center text-gray-500 mt-1">
                                {interventionsForDay.length} missions
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Détail du jour sélectionné - Desktop uniquement */}
        <div className="hidden lg:block card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : 'Sélectionnez un jour'}
          </h3>

          {!selectedDate ? (
            <p className="text-gray-500 text-sm">
              Cliquez sur un jour pour voir vos missions.
            </p>
          ) : selectedInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Aucune mission prévue ce jour.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedInterventions.map((mission) => (
                <div
                  key={mission.id}
                  onClick={() => navigate(`/prestataire/missions/${mission.id}`)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {mission.logement?.name}
                    </span>
                    <StatusBadge status={mission.status} />
                  </div>
                  <p className="text-sm text-gray-600">
                    {mission.logement?.city}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vue mobile - Détail du jour sélectionné */}
      {selectedDate && selectedInterventions.length > 0 && (
        <div className="mt-4 lg:hidden card">
          <h3 className="font-semibold text-gray-900 mb-3">
            {new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <div className="space-y-2">
            {selectedInterventions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => navigate(`/prestataire/missions/${mission.id}`)}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {mission.logement?.name}
                  </span>
                  <StatusBadge status={mission.status} />
                </div>
                <p className="text-xs text-gray-600">
                  {mission.logement?.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
