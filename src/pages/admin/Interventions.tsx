import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Search, Filter } from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useLogements } from '../../hooks/useLogements';
import { usePrestataires } from '../../hooks/useProfiles';
import { Modal } from '../../components/ui/Modal';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { InterventionCard } from '../../components/cards/InterventionCard';
import { InterventionForm } from '../../components/forms/InterventionForm';
import { InterventionStatusLabels } from '../../types';
import type { Intervention, InterventionInsert, InterventionStatus } from '../../types';

export function AdminInterventions() {
  const navigate = useNavigate();
  const { interventions, isLoading, createIntervention, updateIntervention, deleteIntervention } =
    useInterventions({ withRelations: true });
  const { logements, isLoading: isLoadingLogements } = useLogements({ withClient: true });
  const { prestataires, isLoading: isLoadingPrestataires } = usePrestataires();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | ''>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingIntervention(null);
    setIsModalOpen(true);
  };

  const handleEdit = (intervention: Intervention) => {
    setEditingIntervention(intervention);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: InterventionInsert) => {
    setIsSubmitting(true);
    try {
      if (editingIntervention) {
        const { error } = await updateIntervention(editingIntervention.id, data);
        if (error) {
          alert(error);
          return;
        }
      } else {
        const { error } = await createIntervention(data);
        if (error) {
          alert(error);
          return;
        }
      }
      setIsModalOpen(false);
      setEditingIntervention(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteIntervention(id);
    if (error) {
      alert(error);
    }
    setDeleteConfirm(null);
  };

  const handleViewDetail = (id: string) => {
    navigate(`/admin/interventions/${id}`);
  };

  // Filtrer les interventions
  const filteredInterventions = interventions.filter((i) => {
    const matchesSearch =
      i.logement?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.logement?.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.prestataire?.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
          <p className="text-gray-600 mt-1">{interventions.length} intervention(s)</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle intervention
        </button>
      </div>

      {/* Filtres */}
      {interventions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par logement, client ou prestataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | '')}
                className="input-field pl-10"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(InterventionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Liste des interventions */}
      {interventions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-gray-400" />}
          title="Aucune intervention"
          description="Créez votre première intervention de ménage."
          action={
            <button onClick={handleCreate} className="btn-primary">
              Créer une intervention
            </button>
          }
        />
      ) : filteredInterventions.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6 text-gray-400" />}
          title="Aucun résultat"
          description="Aucune intervention ne correspond à vos critères."
        />
      ) : (
        <div className="grid gap-4">
          {filteredInterventions.map((intervention) => (
            <InterventionCard
              key={intervention.id}
              intervention={intervention}
              showClient
              onEdit={() => handleEdit(intervention)}
              onDelete={() => setDeleteConfirm(intervention.id)}
              onClick={() => handleViewDetail(intervention.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIntervention(null);
        }}
        title={editingIntervention ? "Modifier l'intervention" : 'Nouvelle intervention'}
        size="lg"
      >
        {isLoadingLogements || isLoadingPrestataires ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <InterventionForm
            intervention={editingIntervention}
            logements={logements}
            prestataires={prestataires}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingIntervention(null);
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
          Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.
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
