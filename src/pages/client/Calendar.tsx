import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { ChevronLeft, ChevronRight, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { getClientStatus, ClientStatusLabels } from '../../types';

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
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status]}`}>
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

    // Jours vides avant le 1er
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Jours du mois
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" />
          Calendrier
        </h1>
        <p className="text-sm text-gray-600 mt-1">Vos interventions programmees</p>
      </div>

      {/* Navigation mois */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="w-full mt-2 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Calendrier */}
      <div className="card overflow-hidden mb-4 p-0">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-gray-50">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Jours */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dateStr, index) => {
            if (!dateStr) {
              return <div key={index} className="h-16 border-t border-l border-gray-100" />;
            }

            const dayInterventions = getInterventionsForDay(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const dayNum = parseInt(dateStr.split('-')[2], 10);

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-16 border-t border-l border-gray-100 p-1 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-primary-50' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center ${
                    isToday
                      ? 'bg-primary-600 text-white rounded-full w-6 h-6'
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
        <div className="card">
          <h3 className="font-semibold mb-3">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>

          {selectedDayInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune intervention ce jour</p>
          ) : (
            <div className="space-y-2">
              {selectedDayInterventions.map((intervention) => {
                const clientStatus = getClientStatus(intervention.status);
                return (
                  <div key={intervention.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{intervention.logement?.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {intervention.logement?.address}, {intervention.logement?.city}
                        </p>
                      </div>
                      <ClientStatusBadge status={clientStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
