import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle, Calendar, BarChart3, MapPin } from 'lucide-react';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';

interface MonthStats {
  month: string;
  interventions: number;
  factureMenage: number;
  factureBlanchisserie: number;
  facture: number;
}

interface ForfaitLogement {
  name: string;
  city: string;
  prix_blanchisserie: number;
}

export function ClientHistorique() {
  const { profile } = useAuth();
  const [historique, setHistorique] = useState<MonthStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<any[]>([]);
  const [forfaitsLogements, setForfaitsLogements] = useState<ForfaitLogement[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      setSelectedMonth(null);
      setMonthDetails([]);
      setForfaitsLogements([]);
      fetchHistorique();
    }
  }, [profile?.id, selectedYear]);

  const fetchHistorique = async () => {
    if (!profile?.id) return;
    setLoading(true);

    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    // Fetch interventions terminées
    const { data: interventions } = await supabase
      .from('interventions')
      .select('date, prix_client_ttc, blanchisserie_incluse, prix_blanchisserie')
      .eq('client_id', profile.id)
      .eq('status', 'terminee')
      .gte('date', startOfYear)
      .lte('date', endOfYear);

    // Fetch forfaits blanchisserie des logements du client
    const { data: logementsAvecForfait } = await supabase
      .from('logements')
      .select('name, city, prix_blanchisserie')
      .eq('client_id', profile.id)
      .eq('type_blanchisserie', 'forfait');

    const forfaitMensuel = (logementsAvecForfait || []).reduce(
      (sum, l: { prix_blanchisserie: number | null }) => sum + (l.prix_blanchisserie || 0),
      0
    );

    // Grouper par mois
    const monthlyStats = new Map<string, MonthStats>();

    for (let m = 1; m <= 12; m++) {
      const monthKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
      monthlyStats.set(monthKey, {
        month: monthKey,
        interventions: 0,
        factureMenage: 0,
        factureBlanchisserie: 0,
        facture: 0,
      });
    }

    (interventions || []).forEach((intervention: {
      date: string;
      prix_client_ttc: number;
      blanchisserie_incluse: boolean;
      prix_blanchisserie: number;
    }) => {
      const monthKey = intervention.date.substring(0, 7);
      const existing = monthlyStats.get(monthKey);
      if (existing) {
        existing.interventions++;
        existing.factureMenage += intervention.prix_client_ttc || 0;
        if (intervention.blanchisserie_incluse) {
          existing.factureBlanchisserie += intervention.prix_blanchisserie || 0;
        }
      }
    });

    // Ajouter les forfaits mensuels à chaque mois passé
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    monthlyStats.forEach((stats, monthKey) => {
      // Ajouter forfait aux mois passés (pas le mois en cours)
      if (monthKey < currentMonth || selectedYear < now.getFullYear()) {
        stats.factureBlanchisserie += forfaitMensuel;
      }
      stats.facture = stats.factureMenage + stats.factureBlanchisserie;
    });

    const result = Array.from(monthlyStats.values())
      .filter((m) => m.month < currentMonth || selectedYear < now.getFullYear())
      .sort((a, b) => b.month.localeCompare(a.month));

    setHistorique(result);
    setLoading(false);
  };

  const fetchMonthDetails = async (monthKey: string) => {
    if (selectedMonth === monthKey) {
      setSelectedMonth(null);
      setMonthDetails([]);
      setForfaitsLogements([]);
      return;
    }
    if (!profile?.id) return;
    setSelectedMonth(monthKey);
    setLoadingDetails(true);

    const [year, month] = monthKey.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch interventions du mois
    const { data } = await supabase
      .from('interventions')
      .select('id, date, type, prix_client_ttc, blanchisserie_incluse, prix_blanchisserie, logement:logements(name, address, city)')
      .eq('client_id', profile.id)
      .eq('status', 'terminee')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // Fetch forfaits blanchisserie
    const { data: forfaits } = await supabase
      .from('logements')
      .select('name, city, prix_blanchisserie')
      .eq('client_id', profile.id)
      .eq('type_blanchisserie', 'forfait');

    setMonthDetails(data || []);
    setForfaitsLogements(
      (forfaits || [])
        .filter((f: { prix_blanchisserie: number | null }) => f.prix_blanchisserie && f.prix_blanchisserie > 0)
        .map((f: { name: string; city: string; prix_blanchisserie: number | null }) => ({
          name: f.name,
          city: f.city,
          prix_blanchisserie: f.prix_blanchisserie || 0,
        }))
    );
    setLoadingDetails(false);
  };

  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const totalAnnuel = historique.reduce((sum, m) => sum + m.facture, 0);
  const totalInterventions = historique.reduce((sum, m) => sum + m.interventions, 0);

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Historique
        </h1>
        <p className="text-sm text-gray-600 mt-1">Vos factures des mois precedents</p>
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
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-5 text-white mb-4">
        <p className="text-purple-100 text-sm">Total facture {selectedYear}</p>
        <p className="text-3xl font-bold mt-1">{totalAnnuel.toFixed(2)}€</p>
        <p className="text-purple-200 text-xs mt-2">{totalInterventions} intervention(s)</p>
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
            <div key={month.month}>
              <div
                className="card cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fetchMonthDetails(month.month)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize">{formatMonthName(month.month)}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3" />
                      {month.interventions} intervention(s)
                    </p>
                    {month.factureBlanchisserie > 0 && (
                      <p className="text-xs text-indigo-500 mt-0.5">
                        🧺 dont {month.factureBlanchisserie.toFixed(2)}€ blanchisserie
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-xl font-bold ${month.facture > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {month.facture.toFixed(2)}€
                    </p>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        selectedMonth === month.month ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Detail des interventions du mois */}
              {selectedMonth === month.month && (
                <div className="mt-2 ml-2 border-l-2 border-purple-200 pl-4 space-y-2 pb-2">
                  {loadingDetails ? (
                    <div className="flex justify-center py-4">
                      <Loader size="sm" />
                    </div>
                  ) : (
                    <>
                      {/* Interventions */}
                      {monthDetails.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">Aucune intervention ce mois.</p>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">
                            Interventions
                          </p>
                          {monthDetails.map((intervention: any) => (
                            <div
                              key={intervention.id}
                              className="bg-white border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    {intervention.logement?.name}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {intervention.logement?.city}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(intervention.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                    {intervention.type && ` — ${intervention.type}`}
                                  </p>
                                  {intervention.blanchisserie_incluse && (
                                    <p className="text-xs text-indigo-500 mt-0.5">
                                      🧺 Blanchisserie: {(intervention.prix_blanchisserie || 0).toFixed(2)}€
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-purple-600">
                                  {(intervention.prix_client_ttc || 0).toFixed(2)}€
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Forfaits blanchisserie */}
                      {forfaitsLogements.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider pt-2">
                            🧺 Forfaits blanchisserie mensuels
                          </p>
                          {forfaitsLogements.map((forfait, idx) => (
                            <div
                              key={idx}
                              className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{forfait.name}</p>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {forfait.city}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-indigo-600">
                                  {forfait.prix_blanchisserie.toFixed(2)}€
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
