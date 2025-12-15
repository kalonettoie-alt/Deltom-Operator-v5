import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Search, Filter, X } from 'lucide-react';
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

type PeriodFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

// Helper pour formater une date en YYYY-MM-DD sans problème de timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AdminInterventions() {
  const navigate = useNavigate();
  const { interventions, isLoading, createIntervention, updateIntervention, deleteIntervention } =
    useInterventions({ withRelations: true });
  const { logements, isLoading: isLoadingLogements } = useLogements({ withClient: true });
  const { prestataires, isLoading: isLoadingPrestataires } = usePrestataires();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | ''>('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [logementFilter, setLogementFilter] = useState('');

  // Calculer les dates de période (utilise formatDateLocal pour éviter les problèmes de timezone)
  const periodDates = useMemo(() => {
    const today = new Date();
    const todayStr = formatDateLocal(today);

    switch (periodFilter) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'this_week': {
        const startOfWeek = new Date(today);
        // Lundi de cette semaine (getDay() retourne 0 pour dimanche)
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(today.getDate() + diffToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start: formatDateLocal(startOfWeek),
          end: formatDateLocal(endOfWeek),
        };
      }
      case 'this_month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: formatDateLocal(startOfMonth),
          end: formatDateLocal(endOfMonth),
        };
      }
      case 'last_month': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: formatDateLocal(startOfLastMonth),
          end: formatDateLocal(endOfLastMonth),
        };
      }
      case 'custom':
        return { start: customDateStart, end: customDateEnd };
      default:
        return { start: '', end: '' };
    }
  }, [periodFilter, customDateStart, customDateEnd]);

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

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPeriodFilter('all');
    setCustomDateStart('');
    setCustomDateEnd('');
    setLogementFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || periodFilter !== 'all' || logementFilter;

  // Filtrer les interventions
  const filteredInterventions = useMemo(() => {
    return interventions.filter((i) => {
      // Filtre recherche
      const matchesSearch = !searchTerm ||
        i.logement?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.logement?.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.prestataire?.full_name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtre statut
      const matchesStatus = !statusFilter || i.status === statusFilter;

      // Filtre période
      let matchesPeriod = true;
      if (periodDates.start && periodDates.end) {
        matchesPeriod = i.date >= periodDates.start && i.date <= periodDates.end;
      } else if (periodDates.start) {
        matchesPeriod = i.date >= periodDates.start;
      } else if (periodDates.end) {
        matchesPeriod = i.date <= periodDates.end;
      }

      // Filtre logement
      const matchesLogement = !logementFilter || i.logement_id === logementFilter;

      return matchesSearch && matchesStatus && matchesPeriod && matchesLogement;
    });
  }, [interventions, searchTerm, statusFilter, periodDates, logementFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Interventions</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">{interventions.length} intervention(s)</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle intervention</span>
          <span className="sm:hidden">Nouvelle</span>
        </button>
      </div>

      {/* Filtres */}
      {interventions.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm md:text-base">
              <Filter className="w-4 h-4" />
              Filtres
            </h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs md:text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Reinitialiser
              </button>
            )}
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Recherche */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Logement, client ou prestataire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 py-2.5 md:py-2 text-sm"
                />
              </div>
            </div>

            {/* Statut et Période sur mobile en grille 2 colonnes */}
            <div className="grid grid-cols-2 gap-3 md:contents">
              {/* Statut */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | '')}
                  className="input-field py-2.5 md:py-2 text-sm"
                >
                  <option value="">Tous</option>
                  {Object.entries(InterventionStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Période */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Periode</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  className="input-field py-2.5 md:py-2 text-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="this_week">Semaine</option>
                  <option value="this_month">Ce mois</option>
                  <option value="last_month">Mois dernier</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Logement - pleine largeur sur mobile */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Logement</label>
              <select
                value={logementFilter}
                onChange={(e) => setLogementFilter(e.target.value)}
                className="input-field py-2.5 md:py-2 text-sm"
              >
                <option value="">Tous les logements</option>
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} - {l.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates personnalisées */}
            {periodFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-3 md:contents">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Date debut</label>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="input-field py-2.5 md:py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="input-field py-2.5 md:py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs md:text-sm text-gray-600">
                {filteredInterventions.length} intervention(s) trouvee(s)
              </p>
            </div>
          )}
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
          action={
            <button onClick={resetFilters} className="btn-secondary">
              Réinitialiser les filtres
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:gap-4">
          {filteredInterventions.map((intervention) => (
            <InterventionCard
              key={intervention.id}
              intervention={intervention}
              showClient
              showTarification
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
