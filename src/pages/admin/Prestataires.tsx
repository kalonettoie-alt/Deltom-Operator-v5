import { useState, useEffect } from 'react';
import { UserCog, Search, Mail, Phone, Briefcase, Euro, CheckCircle, XCircle } from 'lucide-react';
import { usePrestataires } from '../../hooks/useProfiles';
import { supabase } from '../../config/supabase';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrestataireCard } from '../../components/cards/PrestataireCard';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Profile, InterventionWithRelations } from '../../types';

interface PrestataireStats {
  missionsTerminees: number;
  revenusGeneres: number;
  missionsRefusees: number;
  tauxAcceptation: number;
}

export function AdminPrestataires() {
  const { prestataires, isLoading } = usePrestataires();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrestataire, setSelectedPrestataire] = useState<Profile | null>(null);
  const [prestataireStats, setPrestataireStats] = useState<PrestataireStats | null>(null);
  const [prestataireInterventions, setPrestataireInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Charger les données du prestataire sélectionné (mois en cours uniquement)
  useEffect(() => {
    if (selectedPrestataire) {
      setIsLoadingDetails(true);

      // Dates du mois en cours
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endOfMonthStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      Promise.all([
        // Missions terminées (mois en cours)
        supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('prestataire_id', selectedPrestataire.id)
          .eq('status', 'terminee')
          .gte('date', startOfMonth)
          .lte('date', endOfMonthStr),
        // Revenus générés (mois en cours)
        supabase
          .from('interventions')
          .select('prix_prestataire_ht')
          .eq('prestataire_id', selectedPrestataire.id)
          .eq('status', 'terminee')
          .gte('date', startOfMonth)
          .lte('date', endOfMonthStr),
        // Missions refusées (interventions où le prestataire est dans refused_by)
        supabase
          .from('interventions')
          .select('refused_by')
          .contains('refused_by', [selectedPrestataire.id]),
        // Total missions assignées (pour calculer le taux d'acceptation)
        supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('prestataire_id', selectedPrestataire.id),
        // Dernières interventions
        supabase
          .from('interventions')
          .select(`
            *,
            logement:logements(*),
            client:profiles!interventions_client_id_fkey(*)
          `)
          .eq('prestataire_id', selectedPrestataire.id)
          .order('date', { ascending: false })
          .limit(10),
      ]).then(([termineesRes, revenusRes, refuseesRes, totalRes, interventionsRes]) => {
        const missionsTerminees = termineesRes.count || 0;
        const revenusGeneres = (revenusRes.data as { prix_prestataire_ht: number }[] || []).reduce((sum, i) => sum + (i.prix_prestataire_ht || 0), 0);
        const missionsRefusees = (refuseesRes.data || []).length;
        const totalAssignees = totalRes.count || 0;
        const tauxAcceptation = totalAssignees + missionsRefusees > 0
          ? Math.round((totalAssignees / (totalAssignees + missionsRefusees)) * 100)
          : 100;

        setPrestataireStats({
          missionsTerminees,
          revenusGeneres,
          missionsRefusees,
          tauxAcceptation,
        });
        setPrestataireInterventions((interventionsRes.data as InterventionWithRelations[]) || []);
        setIsLoadingDetails(false);
      });
    }
  }, [selectedPrestataire]);

  // Filtrer les prestataires
  const filteredPrestataires = prestataires.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Prestataires</h1>
        <p className="text-gray-600 mt-1">{prestataires.length} prestataire(s) inscrit(s)</p>
      </div>

      {/* Barre de recherche */}
      {prestataires.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, société ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      {/* Liste des prestataires */}
      {prestataires.length === 0 ? (
        <EmptyState
          icon={<UserCog className="w-6 h-6 text-gray-400" />}
          title="Aucun prestataire"
          description="Les prestataires apparaîtront ici après leur inscription."
        />
      ) : filteredPrestataires.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucun prestataire ne correspond à votre recherche."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrestataires.map((prestataire) => (
            <PrestataireCard
              key={prestataire.id}
              prestataire={prestataire}
              onClick={() => setSelectedPrestataire(prestataire)}
            />
          ))}
        </div>
      )}

      {/* Modal détails prestataire */}
      <Modal
        isOpen={selectedPrestataire !== null}
        onClose={() => setSelectedPrestataire(null)}
        title="Détails du prestataire"
        size="lg"
      >
        {selectedPrestataire && (
          <div className="space-y-6">
            {/* Infos générales */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 font-bold text-2xl">
                  {selectedPrestataire.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedPrestataire.full_name}</h3>
                {selectedPrestataire.company_name && (
                  <p className="text-gray-600">{selectedPrestataire.company_name}</p>
                )}
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Mail className="w-4 h-4" />
                  <span>{selectedPrestataire.email}</span>
                </div>
                {selectedPrestataire.phone && (
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{selectedPrestataire.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : prestataireStats && (
              <>
                {/* Statistiques du mois */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Statistiques</h4>
                  <p className="text-xs text-gray-500 mb-3 capitalize">
                    {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Missions terminées</span>
                      </div>
                      <p className="text-2xl font-bold text-green-800">{prestataireStats.missionsTerminees}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <Euro className="w-5 h-5" />
                        <span className="font-medium">Revenus générés</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-800">{prestataireStats.revenusGeneres.toFixed(2)}€</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700 mb-1">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">Missions refusées</span>
                      </div>
                      <p className="text-2xl font-bold text-red-800">{prestataireStats.missionsRefusees}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-700 mb-1">
                        <Briefcase className="w-5 h-5" />
                        <span className="font-medium">Taux d'acceptation</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-800">{prestataireStats.tauxAcceptation}%</p>
                    </div>
                  </div>
                </div>

                {/* Historique missions */}
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Briefcase className="w-5 h-5" />
                    Dernières missions
                  </h4>
                  {prestataireInterventions.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune mission</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {prestataireInterventions.map((intervention) => (
                        <div key={intervention.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{intervention.logement?.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(intervention.date).toLocaleDateString('fr-FR')} - {intervention.prix_prestataire_ht}€ HT
                            </p>
                          </div>
                          <StatusBadge status={intervention.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button onClick={() => setSelectedPrestataire(null)} className="btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
