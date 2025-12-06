import { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Building2, ClipboardList } from 'lucide-react';
import { useClients } from '../../hooks/useProfiles';
import { supabase } from '../../config/supabase';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClientCard } from '../../components/cards/ClientCard';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Profile, Logement, InterventionWithRelations } from '../../types';

export function AdminClients() {
  const { clients, isLoading } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientLogements, setClientLogements] = useState<Logement[]>([]);
  const [clientInterventions, setClientInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Charger les données du client sélectionné
  useEffect(() => {
    if (selectedClient) {
      setIsLoadingDetails(true);
      Promise.all([
        supabase.from('logements').select('*').eq('client_id', selectedClient.id),
        supabase
          .from('interventions')
          .select(`
            *,
            logement:logements(*),
            prestataire:profiles!interventions_prestataire_id_fkey(*)
          `)
          .eq('client_id', selectedClient.id)
          .order('date', { ascending: false })
          .limit(10),
      ]).then(([logementsRes, interventionsRes]) => {
        setClientLogements((logementsRes.data as Logement[]) || []);
        setClientInterventions((interventionsRes.data as InterventionWithRelations[]) || []);
        setIsLoadingDetails(false);
      });
    }
  }, [selectedClient]);

  // Filtrer les clients
  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-gray-600 mt-1">{clients.length} client(s) inscrit(s)</p>
      </div>

      {/* Barre de recherche */}
      {clients.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      {/* Liste des clients */}
      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-gray-400" />}
          title="Aucun client"
          description="Les clients apparaîtront ici après leur inscription."
        />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucun client ne correspond à votre recherche."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setSelectedClient(client)}
            />
          ))}
        </div>
      )}

      {/* Modal détails client */}
      <Modal
        isOpen={selectedClient !== null}
        onClose={() => setSelectedClient(null)}
        title="Détails du client"
        size="lg"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Infos générales */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold text-2xl">
                  {selectedClient.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedClient.full_name}</h3>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Mail className="w-4 h-4" />
                  <span>{selectedClient.email}</span>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : (
              <>
                {/* Logements */}
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5" />
                    Logements ({clientLogements.length})
                  </h4>
                  {clientLogements.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucun logement enregistré</p>
                  ) : (
                    <div className="space-y-2">
                      {clientLogements.map((logement) => (
                        <div key={logement.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="font-medium text-gray-900">{logement.name}</p>
                          <p className="text-sm text-gray-600">
                            {logement.address}, {logement.postal_code} {logement.city}
                          </p>
                          {(logement.prix_prestataire_ht || logement.prix_client_ttc) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Prix: {logement.prix_prestataire_ht ?? 0}€ HT / {logement.prix_client_ttc ?? 0}€ TTC
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historique interventions */}
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <ClipboardList className="w-5 h-5" />
                    Dernières interventions
                  </h4>
                  {clientInterventions.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune intervention</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clientInterventions.map((intervention) => (
                        <div key={intervention.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{intervention.logement?.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(intervention.date).toLocaleDateString('fr-FR')}
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
              <button onClick={() => setSelectedClient(null)} className="btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
