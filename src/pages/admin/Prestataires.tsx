import { useState } from 'react';
import { UserCog, Search } from 'lucide-react';
import { usePrestataires } from '../../hooks/useProfiles';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrestataireCard } from '../../components/cards/PrestataireCard';

export function AdminPrestataires() {
  const { prestataires, isLoading } = usePrestataires();
  const [searchTerm, setSearchTerm] = useState('');

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
            <PrestataireCard key={prestataire.id} prestataire={prestataire} />
          ))}
        </div>
      )}
    </div>
  );
}
