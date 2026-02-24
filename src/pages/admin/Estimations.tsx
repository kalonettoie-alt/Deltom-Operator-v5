import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserCheck,
  Euro,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';

interface PrestataireCharge {
  id: string;
  full_name: string;
  nbMissions: number;
  caEstime: number;
  charge: 'sous-utilisé' | 'équilibré' | 'surchargé';
}

interface MissionNonAssignee {
  id: string;
  date: string;
  logementName: string;
  logementCity: string;
  clientName: string;
}

interface MonthEstimation {
  totalInterventions: number;
  assignees: number;
  nonAssignees: number;
  revenuEstime: number;
  gainEstime: number;
  prestataires: PrestataireCharge[];
  missionsNonAssignees: MissionNonAssignee[];
}

export function AdminEstimations() {
  const [loading, setLoading] = useState(true);
  const [estimation, setEstimation] = useState<MonthEstimation | null>(null);

  // Mois sélectionné (0 = mois en cours, 1 = mois prochain)
  const [monthOffset, setMonthOffset] = useState(0);

  const getMonthRange = (offset: number) => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return { firstDay, lastDayStr, label: target.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  };

  const { label: monthLabel } = getMonthRange(monthOffset);

  useEffect(() => {
    fetchEstimation();
  }, [monthOffset]);

  const fetchEstimation = async () => {
    setLoading(true);
    const { firstDay, lastDayStr } = getMonthRange(monthOffset);

    // Récupérer les interventions du mois
    const { data: interventions } = await supabase
      .from('interventions')
      .select(`
        id, date, status, prix_client_ttc, prix_prestataire_ht, blanchisserie_incluse, prix_blanchisserie,
        prestataire_id,
        logement:logements(name, city),
        client:profiles!interventions_client_id_fkey(full_name),
        prestataire:profiles!interventions_prestataire_id_fkey(full_name)
      `)
      .gte('date', firstDay)
      .lte('date', lastDayStr)
      .order('date', { ascending: true });

    const data = interventions || [];

    const totalInterventions = data.length;
    const assignees = data.filter((i: any) => i.prestataire_id !== null).length;
    const nonAssignees = totalInterventions - assignees;

    // Revenu estimé (somme prix_client_ttc + blanchisserie)
    let revenuEstime = 0;
    let coutPrestataires = 0;
    data.forEach((i: any) => {
      revenuEstime += (i.prix_client_ttc || 0);
      if (i.blanchisserie_incluse) {
        revenuEstime += (i.prix_blanchisserie || 0);
      }
      coutPrestataires += (i.prix_prestataire_ht || 0);
    });

    // Forfaits blanchisserie mensuels
    const { data: forfaits } = await supabase
      .from('logements')
      .select('prix_blanchisserie')
      .eq('type_blanchisserie', 'forfait');

    const forfaitTotal = (forfaits || []).reduce(
      (sum: number, l: any) => sum + (l.prix_blanchisserie || 0),
      0
    );

    revenuEstime += forfaitTotal;
    const gainEstime = revenuEstime - coutPrestataires;

    // Charge et CA par prestataire
    const prestaMap = new Map<string, { full_name: string; count: number; ca: number }>();
    data.forEach((i: any) => {
      if (i.prestataire_id && i.prestataire) {
        const existing = prestaMap.get(i.prestataire_id);
        const prixPresta = i.prix_prestataire_ht || 0;
        if (existing) {
          existing.count++;
          existing.ca += prixPresta;
        } else {
          prestaMap.set(i.prestataire_id, {
            full_name: i.prestataire.full_name,
            count: 1,
            ca: prixPresta,
          });
        }
      }
    });

    // Déterminer la charge (seuils: < 5 sous-utilisé, 5-15 équilibré, > 15 surchargé)
    const prestataires: PrestataireCharge[] = Array.from(prestaMap.entries()).map(([id, p]) => ({
      id,
      full_name: p.full_name,
      nbMissions: p.count,
      caEstime: p.ca,
      charge: p.count < 5 ? 'sous-utilisé' : p.count > 15 ? 'surchargé' : 'équilibré',
    }));

    // Trier par nombre de missions décroissant
    prestataires.sort((a, b) => b.nbMissions - a.nbMissions);

    // Missions non assignées
    const missionsNonAssignees: MissionNonAssignee[] = data
      .filter((i: any) => i.prestataire_id === null)
      .map((i: any) => ({
        id: i.id,
        date: i.date,
        logementName: i.logement?.name || 'Inconnu',
        logementCity: i.logement?.city || '',
        clientName: i.client?.full_name || 'Inconnu',
      }));

    setEstimation({
      totalInterventions,
      assignees,
      nonAssignees,
      revenuEstime,
      gainEstime,
      prestataires,
      missionsNonAssignees,
    });

    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const getChargeColor = (charge: string) => {
    switch (charge) {
      case 'surchargé': return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
      case 'équilibré': return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
      case 'sous-utilisé': return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-500' };
    }
  };

  return (
    <div className="pb-20 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          Estimations
        </h1>
        <p className="text-sm text-gray-500 mt-1">Prévisions d'activité et charge de travail</p>
      </div>

      {/* Sélecteur de mois */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMonthOffset((m) => m - 1)}
            disabled={monthOffset <= 0}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-lg font-bold capitalize">{monthLabel}</p>
          <button
            onClick={() => setMonthOffset((m) => m + 1)}
            disabled={monthOffset >= 2}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : !estimation ? (
        <EmptyState
          icon={<TrendingUp className="w-6 h-6 text-gray-400" />}
          title="Aucune donnée"
          description="Aucune estimation disponible."
        />
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            {/* Interventions */}
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interventions</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{estimation.totalInterventions}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Assignées */}
            <div className="bg-green-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assignées</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {estimation.assignees}/{estimation.totalInterventions}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Revenu estimé */}
            <div className="bg-emerald-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Revenu estimé</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(estimation.revenuEstime)}</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <Euro className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Gain estimé */}
            <div className="bg-purple-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gain estimé</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(estimation.gainEstime)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Alerte missions non assignées */}
          {estimation.nonAssignees > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">
                  {estimation.nonAssignees} mission(s) non assignée(s)
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Des interventions n'ont pas encore de prestataire attribué.
                </p>
              </div>
            </div>
          )}

          {/* Charge et CA par prestataire */}
          {estimation.prestataires.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Charge et CA par prestataire
              </h2>
              <div className="space-y-4">
                {estimation.prestataires.map((presta) => {
                  const colors = getChargeColor(presta.charge);
                  // Barre de charge: max = 20 missions pour 100%
                  const barWidth = Math.min((presta.nbMissions / 20) * 100, 100);
                  return (
                    <div key={presta.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{presta.full_name}</p>
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                            CA estimé : {formatCurrency(presta.caEstime)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">{presta.nbMissions} missions</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                            {presta.charge}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${colors.bar}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missions non assignées (liste) */}
          {estimation.missionsNonAssignees.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Missions non assignées
              </h2>
              <div className="space-y-3">
                {estimation.missionsNonAssignees.map((mission) => (
                  <div
                    key={mission.id}
                    className="bg-amber-50 border border-amber-100 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{mission.logementName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {mission.logementCity}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Client: {mission.clientName}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(mission.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
