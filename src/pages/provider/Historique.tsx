import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeft, ChevronRight, CheckCircle, Calendar, BarChart3 } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';

interface MonthStats {
  month: string;
  interventions: number;
  revenus: number;
}

export function ProviderHistorique() {
  const { profile } = useAuth();
  const [historique, setHistorique] = useState<MonthStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (profile?.id) {
      fetchHistorique();
    }
  }, [profile?.id, selectedYear]);

  const fetchHistorique = async () => {
    if (!profile?.id) return;
    setLoading(true);

    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    const { data: interventions } = await supabase
      .from('interventions')
      .select('date, prix_prestataire_ht')
      .eq('prestataire_id', profile.id)
      .eq('status', 'terminee')
      .gte('date', startOfYear)
      .lte('date', endOfYear);

    // Grouper par mois
    const monthlyStats = new Map<string, MonthStats>();

    for (let m = 1; m <= 12; m++) {
      const monthKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
      monthlyStats.set(monthKey, { month: monthKey, interventions: 0, revenus: 0 });
    }

    (interventions || []).forEach((intervention: { date: string; prix_prestataire_ht: number }) => {
      const monthKey = intervention.date.substring(0, 7);
      const existing = monthlyStats.get(monthKey);
      if (existing) {
        existing.interventions++;
        existing.revenus += intervention.prix_prestataire_ht || 0;
      }
    });

    // Filtrer les mois passes uniquement
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = Array.from(monthlyStats.values())
      .filter((m) => m.month < currentMonth || selectedYear < now.getFullYear())
      .sort((a, b) => b.month.localeCompare(a.month));

    setHistorique(result);
    setLoading(false);
  };

  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const totalAnnuel = historique.reduce((sum, m) => sum + m.revenus, 0);
  const totalInterventions = historique.reduce((sum, m) => sum + m.interventions, 0);

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Mon historique
        </h1>
        <p className="text-sm text-gray-600 mt-1">Revenus des mois precedents</p>
      </div>

      {/* Selection de l'annee */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-semibold">{selectedYear}</p>
          <button
            onClick={() => setSelectedYear((y) => Math.min(y + 1, new Date().getFullYear()))}
            disabled={selectedYear >= new Date().getFullYear()}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Total annuel */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white mb-4">
        <p className="text-blue-100 text-sm">Total {selectedYear}</p>
        <p className="text-3xl font-bold mt-1">{totalAnnuel.toFixed(2)}€</p>
        <p className="text-blue-200 text-xs mt-2">{totalInterventions} intervention(s)</p>
      </div>

      {/* Liste des mois */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : historique.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6 text-gray-400" />}
          title="Aucun historique"
          description={`Aucune donnee pour l'annee ${selectedYear}.`}
        />
      ) : (
        <div className="space-y-3">
          {historique.map((month) => (
            <div key={month.month} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold capitalize">{formatMonthName(month.month)}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    {month.interventions} intervention(s)
                  </p>
                </div>
                <p className={`text-xl font-bold ${month.revenus > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {month.revenus.toFixed(2)}€
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
