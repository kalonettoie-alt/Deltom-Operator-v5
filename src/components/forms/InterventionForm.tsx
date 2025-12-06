import { useState, useEffect } from 'react';
import { Loader } from '../ui/Loader';
import { InterventionTypeLabels } from '../../types';
import type {
  Intervention,
  InterventionInsert,
  Profile,
  LogementWithClient,
  InterventionType,
} from '../../types';

interface InterventionFormProps {
  intervention?: Intervention | null;
  logements: LogementWithClient[];
  prestataires: Profile[];
  onSubmit: (data: InterventionInsert) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function InterventionForm({
  intervention,
  logements,
  prestataires,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: InterventionFormProps) {
  const [formData, setFormData] = useState<{
    logement_id: string;
    client_id: string;
    prestataire_id: string;
    date: string;
    type: InterventionType;
    nb_voyageurs: number;
    has_baby: boolean;
    special_instructions: string;
  }>({
    logement_id: '',
    client_id: '',
    prestataire_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'standard',
    nb_voyageurs: 2,
    has_baby: false,
    special_instructions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedLogement, setSelectedLogement] = useState<LogementWithClient | null>(null);

  useEffect(() => {
    if (intervention) {
      setFormData({
        logement_id: intervention.logement_id,
        client_id: intervention.client_id,
        prestataire_id: intervention.prestataire_id || '',
        date: intervention.date,
        type: intervention.type,
        nb_voyageurs: intervention.nb_voyageurs,
        has_baby: intervention.has_baby,
        special_instructions: intervention.special_instructions || '',
      });
      // Trouver le logement sélectionné
      const logement = logements.find(l => l.id === intervention.logement_id);
      if (logement) setSelectedLogement(logement);
    }
  }, [intervention, logements]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Auto-select client when logement is selected et récupérer les prix
      if (name === 'logement_id') {
        const logement = logements.find((l) => l.id === value);
        if (logement) {
          setFormData((prev) => ({ ...prev, client_id: logement.client_id }));
          setSelectedLogement(logement);
        } else {
          setSelectedLogement(null);
        }
      }
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.logement_id) newErrors.logement_id = 'Le logement est requis';
    if (!formData.date) newErrors.date = 'La date est requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Déterminer le statut automatiquement
    // Pour une nouvelle intervention : a_attribuer si pas de prestataire, assignee si prestataire
    // Pour une modification : garder le statut actuel si l'intervention existe déjà
    let status = intervention?.status;
    if (!intervention) {
      status = formData.prestataire_id ? 'assignee' : 'a_attribuer';
    } else if (!intervention.prestataire_id && formData.prestataire_id) {
      // On assigne un prestataire à une intervention qui n'en avait pas
      status = 'assignee';
    } else if (intervention.prestataire_id && !formData.prestataire_id) {
      // On retire le prestataire
      status = 'a_attribuer';
    }

    // Récupérer les prix depuis le logement
    const logement = logements.find(l => l.id === formData.logement_id);

    await onSubmit({
      logement_id: formData.logement_id,
      client_id: formData.client_id,
      prestataire_id: formData.prestataire_id || null,
      date: formData.date,
      type: formData.type,
      status: status,
      nb_voyageurs: formData.nb_voyageurs,
      has_baby: formData.has_baby,
      special_instructions: formData.special_instructions || null,
      prix_prestataire_ht: logement?.prix_prestataire_ht || 0,
      prix_client_ttc: logement?.prix_client_ttc || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Logement */}
      <div>
        <label htmlFor="logement_id" className="block text-sm font-medium text-gray-700 mb-1">
          Logement *
        </label>
        <select
          id="logement_id"
          name="logement_id"
          value={formData.logement_id}
          onChange={handleChange}
          className={`input-field ${errors.logement_id ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
        >
          <option value="">Sélectionner un logement</option>
          {logements.map((logement) => (
            <option key={logement.id} value={logement.id}>
              {logement.name} - {logement.city} ({logement.client?.full_name})
            </option>
          ))}
        </select>
        {errors.logement_id && <p className="text-red-500 text-sm mt-1">{errors.logement_id}</p>}
      </div>

      {/* Affichage des prix du logement sélectionné */}
      {selectedLogement && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-gray-700 mb-1">Prix par défaut du logement :</p>
          <div className="flex gap-4 text-gray-600">
            <span>Prestataire HT : {selectedLogement.prix_prestataire_ht ?? 0}€</span>
            <span>Client TTC : {selectedLogement.prix_client_ttc ?? 0}€</span>
          </div>
        </div>
      )}

      {/* Date et Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`input-field ${errors.date ? 'border-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="input-field"
            disabled={isSubmitting}
          >
            {Object.entries(InterventionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prestataire */}
      <div>
        <label htmlFor="prestataire_id" className="block text-sm font-medium text-gray-700 mb-1">
          Prestataire
        </label>
        <select
          id="prestataire_id"
          name="prestataire_id"
          value={formData.prestataire_id}
          onChange={handleChange}
          className="input-field"
          disabled={isSubmitting}
        >
          <option value="">Non assigné (statut: À attribuer)</option>
          {prestataires.map((prestataire) => (
            <option key={prestataire.id} value={prestataire.id}>
              {prestataire.full_name}
            </option>
          ))}
        </select>
        {formData.prestataire_id && (
          <p className="text-xs text-orange-600 mt-1">
            Le prestataire devra accepter cette mission
          </p>
        )}
      </div>

      {/* Voyageurs et bébé */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nb_voyageurs" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de voyageurs
          </label>
          <input
            type="number"
            id="nb_voyageurs"
            name="nb_voyageurs"
            value={formData.nb_voyageurs}
            onChange={handleChange}
            min={1}
            max={20}
            className="input-field"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center pt-6">
          <input
            type="checkbox"
            id="has_baby"
            name="has_baby"
            checked={formData.has_baby}
            onChange={handleChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            disabled={isSubmitting}
          />
          <label htmlFor="has_baby" className="ml-2 block text-sm text-gray-700">
            Lit bébé / équipement bébé
          </label>
        </div>
      </div>

      {/* Instructions spéciales */}
      <div>
        <label htmlFor="special_instructions" className="block text-sm font-medium text-gray-700 mb-1">
          Instructions spéciales
        </label>
        <textarea
          id="special_instructions"
          name="special_instructions"
          value={formData.special_instructions}
          onChange={handleChange}
          rows={3}
          className="input-field"
          placeholder="Instructions particulières pour cette intervention..."
          disabled={isSubmitting}
        />
      </div>

      {/* Boutons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader size="sm" className="border-white border-t-transparent" />}
          {intervention ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
