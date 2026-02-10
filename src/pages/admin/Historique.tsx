import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useLogements } from '../../hooks/useLogements';
import { useClients, usePrestataires } from '../../hooks/useProfiles';
import {
  TrendingUp, TrendingDown, Users, Building2,
  Euro, Filter, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { Loader } from '../../components/ui/Loader';

interface BlanchisserieIntervDetail {
  logement: string;
  prix: number;
  date: string;
}

interface ForfaitDetail {
  id: string;
  nom: string;
  prix: number;
}

interface MonthlyStats {
  month: string;
  interventionsCount: number;
  interventionsTerminees: number;
  totalFactureClient: number;
  totalPayePrestataire: number;
  margeMenages: number;
  blanchisserieInterventions: number;
  blanchisserieInterventionsDetail: BlanchisserieIntervDetail[];
  blanchisserieForfaits: number;
  forfaitsDetail: ForfaitDetail[];
  totalBlanchisserie: number;
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

    // Forfaits blanchisserie - avec filtres et detail par logement
    let forfaitQuery = supabase
      .from('logements')
      .select('id, name, prix_blanchisserie, client_id, city')
      .eq('type_blanchisserie', 'forfait');

    // Appliquer les filtres aux forfaits
    if (filterClient) forfaitQuery = forfaitQuery.eq('client_id', filterClient);
    if (filterLogement) forfaitQuery = forfaitQuery.eq('id', filterLogement);

    const { data: logementsAvecForfait } = await forfaitQuery;

    // Construire le detail des forfaits par logement
    const forfaitsDetail: ForfaitDetail[] = (logementsAvecForfait || []).map((l) => ({
      id: l.id,
      nom: `${l.name}${l.city ? ` - ${l.city}` : ''}`,
      prix: l.prix_blanchisserie || 0,
    }));

    const blanchisserieForfaits = forfaitsDetail.reduce((sum, l) => sum + l.prix, 0);

    const terminees = (interventions || []).filter((i: { status: string }) => i.status === 'terminee');

    let totalFactureClient = 0;
    let totalPayePrestataire = 0;
    let blanchisserieInterventions = 0;
    const blanchisserieInterventionsDetail: BlanchisserieIntervDetail[] = [];
    const prestataireMap = new Map<string, { id: string; name: string; interventions: number; revenus: number }>();
    const clientMap = new Map<string, { id: string; name: string; interventions: number; facture: number }>();
    const logementMap = new Map<string, { id: string; name: string; interventions: number; revenus: number }>();

    terminees.forEach((intervention: Record<string, unknown>) => {
      const prixClient = Number(intervention.prix_client_ttc) || 0;
      const prixPrestataire = Number(intervention.prix_prestataire_ht) || 0;
      const blanchIncluse = intervention.blanchisserie_incluse as boolean;
      const blanchPrix = Number(intervention.prix_blanchisserie) || 0;
      const logement = intervention.logement as { name?: string } | null;

      totalFactureClient += prixClient;
      totalPayePrestataire += prixPrestataire;
      if (blanchIncluse && blanchPrix > 0) {
        blanchisserieInterventions += blanchPrix;
        blanchisserieInterventionsDetail.push({
          logement: logement?.name || 'Inconnu',
          prix: blanchPrix,
          date: intervention.date as string,
        });
      }

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
      blanchisserieInterventionsDetail,
      blanchisserieForfaits,
      forfaitsDetail,
      totalBlanchisserie,
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

          {/* SECTION 1 : MENAGES */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-lg">🧹</span> Menages
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Facture aux clients</span>
                <span className="font-medium text-green-600">+{stats.totalFactureClient.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Paye aux prestataires</span>
                <span className="font-medium text-red-600">-{stats.totalPayePrestataire.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold">Marge menages</span>
                <span className={`font-bold text-lg ${stats.margeMenages >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                  {stats.margeMenages.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2 : BLANCHISSERIE */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-lg">🧺</span> Blanchisserie
            </h3>

            {/* Blanchisserie par intervention */}
            {stats.blanchisserieInterventions > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Par intervention :</p>
                <div className="space-y-1 pl-4">
                  {stats.blanchisserieInterventionsDetail.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.logement}</span>
                      <span className="text-purple-600">+{item.prix.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-dashed text-sm">
                  <span className="text-gray-500">Sous-total interventions</span>
                  <span className="font-medium text-purple-600">+{stats.blanchisserieInterventions.toFixed(2)}€</span>
                </div>
              </div>
            )}

            {/* Forfaits mensuels - DETAIL PAR LOGEMENT */}
            {stats.forfaitsDetail.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Forfaits mensuels :</p>
                <div className="space-y-1 pl-4">
                  {stats.forfaitsDetail.map((logement) => (
                    <div key={logement.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{logement.nom}</span>
                      <span className="text-purple-600">+{logement.prix.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-dashed text-sm">
                  <span className="text-gray-500">Sous-total forfaits</span>
                  <span className="font-medium text-purple-600">+{stats.blanchisserieForfaits.toFixed(2)}€</span>
                </div>
              </div>
            )}

            {/* Si aucune blanchisserie */}
            {stats.blanchisserieInterventions === 0 && stats.blanchisserieForfaits === 0 && (
              <p className="text-gray-400 text-sm">Aucune blanchisserie ce mois</p>
            )}

            {/* Total blanchisserie */}
            {(stats.blanchisserieInterventions > 0 || stats.blanchisserieForfaits > 0) && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-3">
                <span className="font-semibold">Total blanchisserie</span>
                <span className="font-bold text-lg text-purple-600">
                  +{stats.totalBlanchisserie.toFixed(2)}€
                </span>
              </div>
            )}
          </div>

          {/* SECTION 3 : GAIN TOTAL */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white mb-4">
            <h3 className="font-semibold mb-3 text-emerald-100 flex items-center gap-2">
              <span className="text-lg">💰</span> Recapitulatif
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-100">Marge menages</span>
                <span className="font-medium">{stats.margeMenages.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-100">Blanchisserie</span>
                <span className="font-medium">+{stats.totalBlanchisserie.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-emerald-400">
                <span className="font-bold text-lg">TON GAIN NET</span>
                <span className="font-bold text-2xl">{stats.gainTotal.toFixed(2)}€</span>
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
