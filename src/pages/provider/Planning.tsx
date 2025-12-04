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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    setCurrentDate(new Date());
    setSelectedDate(null);
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
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Mon planning</h1>
        <p className="text-gray-600 mt-1">Vue mensuelle de vos missions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendrier */}
        <div className="lg:col-span-2 card">
          {/* Header du calendrier */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={goToToday} className="btn-secondary text-sm">
              Aujourd'hui
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
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
                    min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${item.day === null ? 'bg-gray-50 cursor-default' : 'hover:bg-gray-50'}
                    ${isToday(item.date) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}
                    ${isSelected ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  {item.day && (
                    <>
                      <span
                        className={`text-sm font-medium ${
                          isToday(item.date) ? 'text-primary-700' : 'text-gray-900'
                        }`}
                      >
                        {item.day}
                      </span>
                      {hasInterventions && (
                        <div className="mt-1">
                          <div className="w-2 h-2 rounded-full bg-primary-500 mx-auto" />
                          {interventionsForDay.length > 1 && (
                            <p className="text-xs text-center text-gray-500 mt-1">
                              {interventionsForDay.length} missions
                            </p>
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

        {/* Détail du jour sélectionné */}
        <div className="card">
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
    </div>
  );
}
