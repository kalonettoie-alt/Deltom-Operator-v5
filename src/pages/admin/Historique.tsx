import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useLogements } from '../../hooks/useLogements';
import { useClients, usePrestataires } from '../../hooks/useProfiles';
import {
  TrendingUp, TrendingDown, Users, Building2,
  Euro, Filter, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { Loader } from '../../components/ui/Loader';

interface MonthlyStats {
  month: string;
  interventionsCount: number;
  interventionsTerminees: number;
  totalFactureClient: number;
  totalPayePrestataire: number;
  margeMenages: number;
  blanchisserieInterventions: number;
  blanchisserieForfaits: number;
  gainTotal: number;
  prestataireStats: {
    id: string;
    name: string;
    interventions: number;
    revenus: number;
  }[];
  clientStats: {
    id: string;
    name: string;
    interventions: number;
    facture: number;
  }[];
  logementStats: {
    id: string;
    name: string;
    interventions: number;
    revenus: number;
  }[];
}

// Helper pour formater une date en YYYY-MM-DD sans probleme de timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const variation = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = variation >= 0;

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive ? '+' : ''}{variation.toFixed(0)}%</span>
    </div>
  );
}

export function AdminHistorique() {
  const { logements } = useLogements({ withClient: true });
  const { clients } = useClients();
  const { prestataires } = usePrestataires();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareMonth, setCompareMonth] = useState<string | null>(null);
  const [compareStats, setCompareStats] = useState<MonthlyStats | null>(null);

  // Filtres
  const [filterPrestataire, setFilterPrestataire] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterLogement, setFilterLogement] = useState('');

  const fetchMonthStats = async (month: string): Promise<MonthlyStats> => {
    const [yearNum, monthNum] = month.split('-').map(Number);
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = formatDateLocal(new Date(yearNum, monthNum, 0));

    let query = supabase
      .from('interventions')
      .select(`
        *,
        logement:logements(*),
        prestataire:profiles!interventions_prestataire_id_fkey(*),
        client:profiles!interventions_client_id_fkey(*)
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (filterPrestataire) query = query.eq('prestataire_id', filterPrestataire);
    if (filterClient) query = query.eq('client_id', filterClient);
    if (filterLogement) query = query.eq('logement_id', filterLogement);

    const { data: interventions } = await query;

    // Forfaits blanchisserie
    const { data: logementsAvecForfait } = await supabase
      .from('logements')
      .select('prix_blanchisserie')
      .eq('type_blanchisserie', 'forfait');

    const blanchisserieForfaits = (logementsAvecForfait || []).reduce(
      (sum: number, l: { prix_blanchisserie: number | null }) => sum + (l.prix_blanchisserie || 0), 0
    );

    const terminees = (interventions || []).filter((i: { status: string }) => i.status === 'terminee');

    let totalFactureClient = 0;
    let totalPayePrestataire = 0;
    let blanchisserieInterventions = 0;
    const prestataireMap = new Map<string, { id: string; name: string; interventions: number; revenus: number }>();
    const clientMap = new Map<string, { id: string; name: string; interventions: number; facture: number }>();
    const logementMap = new Map<string, { id: string; name: string; interventions: number; revenus: number }>();

    terminees.forEach((intervention: Record<string, unknown>) => {
      const prixClient = Number(intervention.prix_client_ttc) || 0;
      const prixPrestataire = Number(intervention.prix_prestataire_ht) || 0;
      const blanchIncluse = intervention.blanchisserie_incluse as boolean;
      const blanchPrix = Number(intervention.prix_blanchisserie) || 0;

      totalFactureClient += prixClient;
      totalPayePrestataire += prixPrestataire;
      if (blanchIncluse) blanchisserieInterventions += blanchPrix;

      // Stats par prestataire
      const prestId = intervention.prestataire_id as string | null;
      const prest = intervention.prestataire as { full_name?: string } | null;
      if (prestId) {
        const existing = prestataireMap.get(prestId) || {
          id: prestId, name: prest?.full_name || 'Inconnu', interventions: 0, revenus: 0,
        };
        existing.interventions++;
        existing.revenus += prixPrestataire;
        prestataireMap.set(prestId, existing);
      }

      // Stats par client
      const clientId = intervention.client_id as string | null;
      const client = intervention.client as { full_name?: string } | null;
      if (clientId) {
        const existing = clientMap.get(clientId) || {
          id: clientId, name: client?.full_name || 'Inconnu', interventions: 0, facture: 0,
        };
        existing.interventions++;
        existing.facture += prixClient;
        clientMap.set(clientId, existing);
      }

      // Stats par logement
      const logId = intervention.logement_id as string | null;
      const log = intervention.logement as { name?: string } | null;
      if (logId) {
        const existing = logementMap.get(logId) || {
          id: logId, name: log?.name || 'Inconnu', interventions: 0, revenus: 0,
        };
        existing.interventions++;
        existing.revenus += prixClient;
        logementMap.set(logId, existing);
      }
    });

    const margeMenages = totalFactureClient - totalPayePrestataire;
    const totalBlanchisserie = blanchisserieInterventions + blanchisserieForfaits;
    const gainTotal = margeMenages + totalBlanchisserie;

    return {
      month,
      interventionsCount: (interventions || []).length,
      interventionsTerminees: terminees.length,
      totalFactureClient,
      totalPayePrestataire,
      margeMenages,
      blanchisserieInterventions,
      blanchisserieForfaits,
      gainTotal,
      prestataireStats: Array.from(prestataireMap.values()).sort((a, b) => b.revenus - a.revenus),
      clientStats: Array.from(clientMap.values()).sort((a, b) => b.facture - a.facture),
      logementStats: Array.from(logementMap.values()).sort((a, b) => b.interventions - a.interventions),
    };
  };

  // Charger stats du mois selectionne
  useEffect(() => {
    setLoading(true);
    fetchMonthStats(selectedMonth).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [selectedMonth, filterPrestataire, filterClient, filterLogement]);

  // Charger stats du mois de comparaison
  useEffect(() => {
    if (compareMonth) {
      fetchMonthStats(compareMonth).then(setCompareStats);
    } else {
      setCompareStats(null);
    }
  }, [compareMonth]);

  const goToPreviousMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const now = new Date();
    if (d < new Date(now.getFullYear(), now.getMonth(), 1)) {
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const hasActiveFilters = filterPrestataire || filterClient || filterLogement;

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Historique
          </h1>
          <p className="text-sm text-gray-600 mt-1">Statistiques des mois passes</p>
        </div>
      </div>

      {/* Selection du mois */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-semibold capitalize">{formatMonthName(selectedMonth)}</p>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Comparaison */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm text-gray-600">Comparer avec :</label>
          <select
            value={compareMonth || ''}
            onChange={(e) => setCompareMonth(e.target.value || null)}
            className="input-field py-1.5 text-sm flex-1 sm:flex-none sm:w-48"
          >
            <option value="">Aucune comparaison</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i - 1);
              const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              return val !== selectedMonth ? (
                <option key={val} value={val}>
                  {formatMonthName(val)}
                </option>
              ) : null;
            })}
          </select>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterPrestataire(''); setFilterClient(''); setFilterLogement(''); }}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Reinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filterPrestataire}
            onChange={(e) => setFilterPrestataire(e.target.value)}
            className="input-field py-2 text-sm"
          >
            <option value="">Tous les prestataires</option>
            {prestataires.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="input-field py-2 text-sm"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          <select
            value={filterLogement}
            onChange={(e) => setFilterLogement(e.target.value)}
            className="input-field py-2 text-sm"
          >
            <option value="">Tous les logements</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>{l.name} - {l.city}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : stats && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="card">
              <p className="text-xs text-gray-500">Interventions</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.interventionsCount}</p>
              {compareStats && <VariationBadge current={stats.interventionsCount} previous={compareStats.interventionsCount} />}
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Terminees</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{stats.interventionsTerminees}</p>
              {compareStats && <VariationBadge current={stats.interventionsTerminees} previous={compareStats.interventionsTerminees} />}
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Facture clients</p>
              <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.totalFactureClient.toFixed(0)}€</p>
              {compareStats && <VariationBadge current={stats.totalFactureClient} previous={compareStats.totalFactureClient} />}
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <p className="text-xs text-emerald-600">Gain net</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-700">{stats.gainTotal.toFixed(0)}€</p>
              {compareStats && <VariationBadge current={stats.gainTotal} previous={compareStats.gainTotal} />}
            </div>
          </div>

          {/* Detail gain */}
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Euro className="w-4 h-4 text-gray-400" />
              Detail des revenus
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Facture clients (menages)</span>
                <span className="text-green-600 font-medium">+{stats.totalFactureClient.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paye prestataires</span>
                <span className="text-red-600 font-medium">-{stats.totalPayePrestataire.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed">
                <span className="font-medium">Marge menages</span>
                <span className="font-semibold">{stats.margeMenages.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blanchisserie (interventions)</span>
                <span className="text-purple-600 font-medium">+{stats.blanchisserieInterventions.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blanchisserie (forfaits)</span>
                <span className="text-purple-600 font-medium">+{stats.blanchisserieForfaits.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-bold">GAIN TOTAL</span>
                <span className="font-bold text-green-600">{stats.gainTotal.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Stats par prestataire */}
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              Par prestataire
            </h3>
            {stats.prestataireStats.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnee</p>
            ) : (
              <div className="space-y-2">
                {stats.prestataireStats.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.interventions} intervention(s)</p>
                    </div>
                    <p className="font-semibold text-blue-600 text-sm">{p.revenus.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats par client */}
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              Par client
            </h3>
            {stats.clientStats.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnee</p>
            ) : (
              <div className="space-y-2">
                {stats.clientStats.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.interventions} intervention(s)</p>
                    </div>
                    <p className="font-semibold text-green-600 text-sm">{c.facture.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats par logement */}
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              Par logement
            </h3>
            {stats.logementStats.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnee</p>
            ) : (
              <div className="space-y-2">
                {stats.logementStats.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-gray-500">{l.interventions} intervention(s)</p>
                    </div>
                    <p className="font-semibold text-purple-600 text-sm">{l.revenus.toFixed(2)}€</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
