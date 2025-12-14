import { useState, useEffect } from 'react';
import { Loader } from '../ui/Loader';
import type { Logement, LogementInsert, Profile, TypeBlanchisserie } from '../../types';

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
  const [formData, setFormData] = useState<LogementInsert & { type_blanchisserie: TypeBlanchisserie }>({
    client_id: '',
    name: '',
    address: '',
    city: '',
    postal_code: '',
    access_code: '',
    instructions: '',
    prix_prestataire_ht: null,
    prix_client_ttc: null,
    type_blanchisserie: 'aucune',
    prix_blanchisserie: null,
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
        type_blanchisserie: logement.type_blanchisserie || 'aucune',
        prix_blanchisserie: logement.prix_blanchisserie,
      });
    }
  }, [logement]);

  // Calculer la marge
  const margeMenage = (formData.prix_client_ttc || 0) - (formData.prix_prestataire_ht || 0);

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

      {/* Section Tarification */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          💰 Tarification
        </h3>

        {/* Prix menage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="prix_prestataire_ht" className="block text-sm font-medium text-gray-700 mb-1">
              Prix prestataire
            </label>
            <div className="relative">
              <input
                type="number"
                id="prix_prestataire_ht"
                name="prix_prestataire_ht"
                value={formData.prix_prestataire_ht ?? ''}
                onChange={handleChange}
                min={0}
                step="0.5"
                className="input-field pr-8"
                placeholder="25"
                disabled={isSubmitting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Ce que vous payez</p>
          </div>

          <div>
            <label htmlFor="prix_client_ttc" className="block text-sm font-medium text-gray-700 mb-1">
              Prix client (menage)
            </label>
            <div className="relative">
              <input
                type="number"
                id="prix_client_ttc"
                name="prix_client_ttc"
                value={formData.prix_client_ttc ?? ''}
                onChange={handleChange}
                min={0}
                step="0.5"
                className="input-field pr-8"
                placeholder="44"
                disabled={isSubmitting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Ce que vous facturez</p>
          </div>
        </div>

        {/* Marge calculee */}
        {(formData.prix_prestataire_ht || 0) > 0 && (formData.prix_client_ttc || 0) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              Marge menage : <span className="font-bold">{margeMenage.toFixed(2)} €</span>
            </p>
          </div>
        )}

        {/* Blanchisserie */}
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🧺 Blanchisserie
          </label>

          {/* Choix du type */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({
                ...prev,
                type_blanchisserie: 'aucune',
                prix_blanchisserie: null,
              }))}
              disabled={isSubmitting}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.type_blanchisserie === 'aucune'
                  ? 'border-gray-500 bg-gray-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm">Aucune</p>
            </button>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({
                ...prev,
                type_blanchisserie: 'intervention',
              }))}
              disabled={isSubmitting}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.type_blanchisserie === 'intervention'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm">Par intervention</p>
            </button>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({
                ...prev,
                type_blanchisserie: 'forfait',
              }))}
              disabled={isSubmitting}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.type_blanchisserie === 'forfait'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm">Forfait mensuel</p>
            </button>
          </div>

          {/* Prix blanchisserie (si pas aucune) */}
          {formData.type_blanchisserie && formData.type_blanchisserie !== 'aucune' && (
            <div className="mt-3">
              <label className="block text-sm text-gray-600 mb-1">
                {formData.type_blanchisserie === 'intervention'
                  ? 'Prix par intervention'
                  : 'Forfait mensuel'}
              </label>
              <div className="relative w-full sm:w-1/2">
                <input
                  type="number"
                  name="prix_blanchisserie"
                  value={formData.prix_blanchisserie ?? ''}
                  onChange={handleChange}
                  placeholder={formData.type_blanchisserie === 'intervention' ? '13' : '50'}
                  className="input-field pr-8"
                  step="0.5"
                  min="0"
                  disabled={isSubmitting}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              </div>
            </div>
          )}
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
