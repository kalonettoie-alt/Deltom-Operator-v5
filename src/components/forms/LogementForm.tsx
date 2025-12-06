import { useState, useEffect } from 'react';
import { Loader } from '../ui/Loader';
import type { Logement, LogementInsert, Profile } from '../../types';

interface LogementFormProps {
  logement?: Logement | null;
  clients: Profile[];
  onSubmit: (data: LogementInsert) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function LogementForm({
  logement,
  clients,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LogementFormProps) {
  const [formData, setFormData] = useState<LogementInsert>({
    client_id: '',
    name: '',
    address: '',
    city: '',
    postal_code: '',
    access_code: '',
    instructions: '',
    prix_prestataire_ht: null,
    prix_client_ttc: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (logement) {
      setFormData({
        client_id: logement.client_id,
        name: logement.name,
        address: logement.address,
        city: logement.city,
        postal_code: logement.postal_code,
        access_code: logement.access_code || '',
        instructions: logement.instructions || '',
        prix_prestataire_ht: logement.prix_prestataire_ht,
        prix_client_ttc: logement.prix_client_ttc,
      });
    }
  }, [logement]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      const numValue = value === '' ? null : parseFloat(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) newErrors.client_id = 'Le client est requis';
    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.address.trim()) newErrors.address = "L'adresse est requise";
    if (!formData.city.trim()) newErrors.city = 'La ville est requise';
    if (!formData.postal_code.trim()) newErrors.postal_code = 'Le code postal est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      ...formData,
      access_code: formData.access_code || null,
      instructions: formData.instructions || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
          Client *
        </label>
        <select
          id="client_id"
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          className={`input-field ${errors.client_id ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
        >
          <option value="">Sélectionner un client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.full_name} ({client.email})
            </option>
          ))}
        </select>
        {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nom du logement *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`input-field ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Ex: Appartement Paris 15"
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Adresse *
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className={`input-field ${errors.address ? 'border-red-500' : ''}`}
          placeholder="Ex: 15 rue de la Paix"
          disabled={isSubmitting}
        />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
            Code postal *
          </label>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            className={`input-field ${errors.postal_code ? 'border-red-500' : ''}`}
            placeholder="75015"
            disabled={isSubmitting}
          />
          {errors.postal_code && <p className="text-red-500 text-sm mt-1">{errors.postal_code}</p>}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Ville *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={`input-field ${errors.city ? 'border-red-500' : ''}`}
            placeholder="Paris"
            disabled={isSubmitting}
          />
          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
        </div>
      </div>

      {/* Prix par défaut */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prix_prestataire_ht" className="block text-sm font-medium text-gray-700 mb-1">
            Prix prestataire HT (€)
          </label>
          <input
            type="number"
            id="prix_prestataire_ht"
            name="prix_prestataire_ht"
            value={formData.prix_prestataire_ht ?? ''}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="input-field"
            placeholder="0.00"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Prix par défaut pour les interventions</p>
        </div>

        <div>
          <label htmlFor="prix_client_ttc" className="block text-sm font-medium text-gray-700 mb-1">
            Prix client TTC (€)
          </label>
          <input
            type="number"
            id="prix_client_ttc"
            name="prix_client_ttc"
            value={formData.prix_client_ttc ?? ''}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="input-field"
            placeholder="0.00"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Prix par défaut pour les interventions</p>
        </div>
      </div>

      <div>
        <label htmlFor="access_code" className="block text-sm font-medium text-gray-700 mb-1">
          Code d'accès
        </label>
        <input
          type="text"
          id="access_code"
          name="access_code"
          value={formData.access_code || ''}
          onChange={handleChange}
          className="input-field"
          placeholder="Ex: Digicode 1234A, boîte à clé..."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
          Instructions permanentes
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={formData.instructions || ''}
          onChange={handleChange}
          rows={3}
          className="input-field"
          placeholder="Instructions spéciales pour le ménage..."
          disabled={isSubmitting}
        />
      </div>

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
          {logement ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
