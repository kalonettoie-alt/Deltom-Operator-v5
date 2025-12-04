import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { useClients } from '../../hooks/useProfiles';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClientCard } from '../../components/cards/ClientCard';

export function AdminClients() {
  const { clients, isLoading } = useClients();
  const [searchTerm, setSearchTerm] = useState('');

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
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
