import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Loader } from '../ui/Loader';
import { useAuth } from '../../hooks/useAuth';
import { canSeeFinancials } from '../../utils/permissions';
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
  prefilledDate?: string;
  prefilledLogement?: string;
}

export function InterventionForm({
  intervention,
  logements,
  prestataires,
  onSubmit,
  onCancel,
  isSubmitting = false,
  prefilledDate,
  prefilledLogement,
}: InterventionFormProps) {
  const { profile } = useAuth();
  // Masque l'affichage financier pour les rôles sans accès (ex: support).
  // N'impacte PAS handleSubmit : les prix sont dérivés du logement à l'enregistrement.
  const showFinancials = canSeeFinancials(profile?.role);

  // Initialiser avec les valeurs pré-remplies si fournies
  const initialLogement = prefilledLogement || '';
  const initialDate = prefilledDate || new Date().toISOString().split('T')[0];
  const initialClient = prefilledLogement
    ? (logements.find(l => l.id === prefilledLogement)?.client_id || '')
    : '';

  const [formData, setFormData] = useState<{
    logement_id: string;
    client_id: string;
    prestataire_id: string;
    date: string;
    type: InterventionType;
    nb_voyageurs: number;
    has_baby: boolean;
    checkin_meme_jour: boolean;
    special_instructions: string;
  }>({
    logement_id: initialLogement,
    client_id: initialClient,
    prestataire_id: '',
    date: initialDate,
    type: 'standard',
    nb_voyageurs: 2,
    has_baby: false,
    checkin_meme_jour: false,
    special_instructions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedLogement, setSelectedLogement] = useState<LogementWithClient | null>(null);
  const [logementSearch, setLogementSearch] = useState('');

  // Filtrer les logements selon la recherche
  const filteredLogements = useMemo(() => {
    // S'assurer que logements est un tableau valide
    const safeLogements = logements || [];

    if (!logementSearch.trim()) return safeLogements;

    const search = logementSearch.toLowerCase().trim();

    return safeLogements.filter((l) => {
      const name = (l.name || '').toLowerCase();
      const city = (l.city || '').toLowerCase();
      const address = (l.address || '').toLowerCase();
      const postalCode = (l.postal_code || '').toLowerCase();
      const clientName = (l.client?.full_name || '').toLowerCase();

      return (
        name.includes(search) ||
        city.includes(search) ||
        address.includes(search) ||
        postalCode.includes(search) ||
        clientName.includes(search)
      );
    });
  }, [logements, logementSearch]);

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
        checkin_meme_jour: intervention.checkin_meme_jour || false,
        special_instructions: intervention.special_instructions || '',
      });
      // Trouver le logement selectionne
      const logement = logements.find(l => l.id === intervention.logement_id);
      if (logement) setSelectedLogement(logement);
    } else if (prefilledLogement) {
      // Pré-sélectionner le logement depuis les filtres actifs
      const logement = logements.find(l => l.id === prefilledLogement);
      if (logement) setSelectedLogement(logement);
    }
  }, [intervention, logements, prefilledLogement]);

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

    // Déterminer si la blanchisserie est incluse (type 'intervention')
    const blanchisserieIncluse = logement?.type_blanchisserie === 'intervention';
    const prixBlanchisserie = blanchisserieIncluse ? (logement?.prix_blanchisserie || 0) : 0;

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
      checkin_meme_jour: formData.checkin_meme_jour,
      prix_prestataire_ht: logement?.prix_prestataire_ht || 0,
      prix_client_ttc: logement?.prix_client_ttc || 0,
      blanchisserie_incluse: blanchisserieIncluse,
      prix_blanchisserie: prixBlanchisserie,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Logement */}
      <div>
        <label htmlFor="logement_id" className="block text-sm font-medium text-gray-700 mb-1">
          Logement *
        </label>
        {/* Champ de recherche */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, adresse, ville, code postal..."
            value={logementSearch}
            onChange={(e) => setLogementSearch(e.target.value)}
            className="input-field pl-10"
            disabled={isSubmitting}
          />
          {logementSearch && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {filteredLogements.length} résultat(s)
            </span>
          )}
        </div>
        <select
          id="logement_id"
          name="logement_id"
          value={formData.logement_id}
          onChange={handleChange}
          className={`input-field ${errors.logement_id ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
        >
          <option value="">Sélectionner un logement</option>
          {filteredLogements.map((logement) => (
            <option key={logement.id} value={logement.id}>
              {logement.name} - {logement.city} ({logement.client?.full_name})
            </option>
          ))}
        </select>
        {filteredLogements.length === 0 && logementSearch && (
          <p className="text-gray-500 text-sm mt-1">Aucun logement trouvé pour "{logementSearch}"</p>
        )}
        {errors.logement_id && <p className="text-red-500 text-sm mt-1">{errors.logement_id}</p>}
      </div>

      {/* Récapitulatif tarification (lecture seule — masqué pour support) */}
      {showFinancials && selectedLogement && ((selectedLogement.prix_prestataire_ht ?? 0) > 0 || (selectedLogement.prix_client_ttc ?? 0) > 0) && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">📋 Recapitulatif tarification</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Prix prestataire</span>
              <span className="font-medium text-red-600">-{(selectedLogement.prix_prestataire_ht ?? 0).toFixed(2)} €</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Prix client menage</span>
              <span className="text-green-600">+{(selectedLogement.prix_client_ttc ?? 0).toFixed(2)} €</span>
            </div>

            {selectedLogement.type_blanchisserie === 'intervention' && (selectedLogement.prix_blanchisserie ?? 0) > 0 && (
              <div className="flex justify-between text-purple-700">
                <span>+ Blanchisserie 🧺</span>
                <span>+{(selectedLogement.prix_blanchisserie ?? 0).toFixed(2)} €</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-blue-200 font-medium">
              <span>Total client</span>
              <span className="font-bold">
                {(
                  (selectedLogement.prix_client_ttc ?? 0) +
                  (selectedLogement.type_blanchisserie === 'intervention' ? (selectedLogement.prix_blanchisserie ?? 0) : 0)
                ).toFixed(2)} €
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="font-medium text-green-700">Gain</span>
              <span className="font-bold text-green-700">
                {(
                  (selectedLogement.prix_client_ttc ?? 0) +
                  (selectedLogement.type_blanchisserie === 'intervention' ? (selectedLogement.prix_blanchisserie ?? 0) : 0) -
                  (selectedLogement.prix_prestataire_ht ?? 0)
                ).toFixed(2)} €
              </span>
            </div>
          </div>

          {selectedLogement.type_blanchisserie === 'forfait' && (selectedLogement.prix_blanchisserie ?? 0) > 0 && (
            <p className="text-xs text-blue-600 mt-3">
              ℹ️ Blanchisserie en forfait mensuel ({(selectedLogement.prix_blanchisserie ?? 0).toFixed(2)} €/mois) - non incluse par intervention
            </p>
          )}
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

      {/* Voyageurs */}
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

      {/* Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Options</label>

        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            id="has_baby"
            name="has_baby"
            checked={formData.has_baby}
            onChange={handleChange}
            className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            disabled={isSubmitting}
          />
          <div>
            <span className="font-medium text-gray-900">Lit bebe a preparer</span>
            <p className="text-sm text-gray-500">Installer et preparer le lit bebe</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors border border-orange-200">
          <input
            type="checkbox"
            id="checkin_meme_jour"
            name="checkin_meme_jour"
            checked={formData.checkin_meme_jour}
            onChange={handleChange}
            className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-orange-300 rounded"
            disabled={isSubmitting}
          />
          <div>
            <span className="font-medium text-orange-800">Check-in prevu le meme jour</span>
            <p className="text-sm text-orange-600">Les voyageurs arrivent juste apres le menage</p>
          </div>
        </label>
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
