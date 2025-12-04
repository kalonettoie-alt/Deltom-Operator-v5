import { useState } from 'react';
import { Plus, Building2, Search } from 'lucide-react';
import { useLogements } from '../../hooks/useLogements';
import { useClients } from '../../hooks/useProfiles';
import { Modal } from '../../components/ui/Modal';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { LogementCard } from '../../components/cards/LogementCard';
import { LogementForm } from '../../components/forms/LogementForm';
import type { Logement, LogementInsert } from '../../types';

export function AdminLogements() {
  const { logements, isLoading, createLogement, updateLogement, deleteLogement } = useLogements({
    withClient: true,
  });
  const { clients, isLoading: isLoadingClients } = useClients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogement, setEditingLogement] = useState<Logement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingLogement(null);
    setIsModalOpen(true);
  };

  const handleEdit = (logement: Logement) => {
    setEditingLogement(logement);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: LogementInsert) => {
    setIsSubmitting(true);
    try {
      if (editingLogement) {
        const { error } = await updateLogement(editingLogement.id, data);
        if (error) {
          alert(error);
          return;
        }
      } else {
        const { error } = await createLogement(data);
        if (error) {
          alert(error);
          return;
        }
      }
      setIsModalOpen(false);
      setEditingLogement(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteLogement(id);
    if (error) {
      alert(error);
    }
    setDeleteConfirm(null);
  };

  // Filtrer les logements
  const filteredLogements = logements.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logements</h1>
          <p className="text-gray-600 mt-1">{logements.length} logement(s) enregistré(s)</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un logement
        </button>
      </div>

      {/* Barre de recherche */}
      {logements.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, adresse, ville ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      {/* Liste des logements */}
      {logements.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-gray-400" />}
          title="Aucun logement"
          description="Commencez par ajouter un logement pour vos clients."
          action={
            <button onClick={handleCreate} className="btn-primary">
              Ajouter un logement
            </button>
          }
        />
      ) : filteredLogements.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucun logement ne correspond à votre recherche."
        />
      ) : (
        <div className="grid gap-4">
          {filteredLogements.map((logement) => (
            <LogementCard
              key={logement.id}
              logement={logement}
              onEdit={() => handleEdit(logement)}
              onDelete={() => setDeleteConfirm(logement.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLogement(null);
        }}
        title={editingLogement ? 'Modifier le logement' : 'Nouveau logement'}
        size="lg"
      >
        {isLoadingClients ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <LogementForm
            logement={editingLogement}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingLogement(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer ce logement ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
            Annuler
          </button>
          <button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            className="btn-danger"
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </div>
  );
}
