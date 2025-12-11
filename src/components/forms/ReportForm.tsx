import { useState } from 'react';
import { Camera, X, AlertTriangle, CheckSquare } from 'lucide-react';
import { Loader } from '../ui/Loader';
import { uploadImages } from '../../utils/storage';
import type { RapportInsert, InterventionType } from '../../types';

// Taches par defaut selon le type de menage
const TACHES_MENAGE: Record<string, { id: string; label: string }[]> = {
  standard: [
    { id: 'poussiere', label: 'Depoussierage des surfaces' },
    { id: 'aspirateur', label: 'Aspirateur / Balai' },
    { id: 'serpillere', label: 'Serpillere' },
    { id: 'sdb', label: 'Nettoyage salle de bain' },
    { id: 'wc', label: 'Nettoyage WC' },
    { id: 'cuisine', label: 'Nettoyage cuisine' },
    { id: 'poubelles', label: 'Vidage poubelles' },
    { id: 'lits', label: 'Changement draps / Faire les lits' },
    { id: 'serviettes', label: 'Changement serviettes' },
  ],
  complet: [
    { id: 'poussiere', label: 'Depoussierage des surfaces' },
    { id: 'aspirateur', label: 'Aspirateur / Balai' },
    { id: 'serpillere', label: 'Serpillere' },
    { id: 'sdb', label: 'Nettoyage salle de bain' },
    { id: 'wc', label: 'Nettoyage WC' },
    { id: 'cuisine', label: 'Nettoyage cuisine' },
    { id: 'poubelles', label: 'Vidage poubelles' },
    { id: 'lits', label: 'Changement draps / Faire les lits' },
    { id: 'serviettes', label: 'Changement serviettes' },
    { id: 'vitres', label: 'Nettoyage vitres' },
    { id: 'frigo', label: 'Nettoyage refrigerateur' },
    { id: 'four', label: 'Nettoyage four' },
    { id: 'placards', label: 'Interieur placards' },
  ],
  conciergerie: [
    { id: 'inspection', label: 'Inspection generale' },
    { id: 'checklist', label: 'Verification checklist proprietaire' },
    { id: 'consommables', label: 'Verification consommables' },
    { id: 'photos', label: 'Photos de l\'etat' },
  ],
};

interface TacheRapport {
  id: string;
  label: string;
  effectuee: boolean;
}

interface ReportFormProps {
  interventionId: string;
  interventionType?: InterventionType;
  onSubmit: (data: RapportInsert) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  showCancelButton?: boolean;
}

export function ReportForm({
  interventionId,
  interventionType = 'standard',
  onSubmit,
  onCancel,
  isSubmitting = false,
  showCancelButton = true,
}: ReportFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [degatsSignales, setDegatsSignales] = useState(false);
  const [degatsDescription, setDegatsDescription] = useState('');
  const [degatsPhotos, setDegatsPhotos] = useState<File[]>([]);
  const [degatsPhotosPreviews, setDegatsPhotosPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Taches effectuees
  const initialTaches = (TACHES_MENAGE[interventionType] || TACHES_MENAGE.standard).map((t) => ({
    ...t,
    effectuee: false,
  }));
  const [taches, setTaches] = useState<TacheRapport[]>(initialTaches);

  const toggleTache = (id: string) => {
    setTaches((prev) =>
      prev.map((t) => (t.id === id ? { ...t, effectuee: !t.effectuee } : t))
    );
  };

  const selectAllTaches = () => {
    setTaches((prev) => prev.map((t) => ({ ...t, effectuee: true })));
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);

    // Creer les previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotosPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDegatsPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDegatsPhotos((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDegatsPhotosPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDegatsPhoto = (index: number) => {
    setDegatsPhotos((prev) => prev.filter((_, i) => i !== index));
    setDegatsPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadError(null);

    console.log('[ReportForm] Soumission du rapport...');
    console.log('[ReportForm] Photos a uploader:', photos.length);

    try {
      // Upload des photos d'intervention
      console.log('[ReportForm] Upload des photos d\'intervention...');
      const photosUrls = await uploadImages(photos, `interventions/${interventionId}`);
      console.log('[ReportForm] Photos uploadees:', photosUrls);

      // Upload des photos de degats si necessaire
      let degatsPhotosUrls: string[] = [];
      if (degatsSignales && degatsPhotos.length > 0) {
        console.log('[ReportForm] Upload des photos de degats...');
        degatsPhotosUrls = await uploadImages(degatsPhotos, `degats/${interventionId}`);
        console.log('[ReportForm] Photos de degats uploadees:', degatsPhotosUrls);
      }

      console.log('[ReportForm] Envoi du rapport a la base de donnees...');
      await onSubmit({
        intervention_id: interventionId,
        photos_intervention: photosUrls,
        degats_signales: degatsSignales,
        degats_description: degatsSignales ? degatsDescription : null,
        degats_photos: degatsPhotosUrls,
        taches_effectuees: taches,
      });
      console.log('[ReportForm] Rapport envoye avec succes!');
    } catch (error) {
      console.error('[ReportForm] Erreur:', error);
      const message = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'upload';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const loading = isSubmitting || isUploading;
  const hasPhotos = photos.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Affichage des erreurs d'upload */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Erreur lors de l'upload des photos:</p>
          <p className="text-sm text-red-600 mt-1">{uploadError}</p>
        </div>
      )}

      {/* Taches effectuees */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-600" />
            Taches effectuees
          </label>
          <button
            type="button"
            onClick={selectAllTaches}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Tout cocher
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {taches.map((tache) => (
            <label
              key={tache.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                tache.effectuee ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <input
                type="checkbox"
                checked={tache.effectuee}
                onChange={() => toggleTache(tache.id)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                disabled={loading}
              />
              <span className={tache.effectuee ? 'text-gray-900' : 'text-gray-600'}>
                {tache.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {taches.filter((t) => t.effectuee).length}/{taches.length} taches cochees
        </p>
      </div>

      {/* Photos de l'intervention */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos du menage termine *
        </label>
        {!hasPhotos && (
          <p className="text-sm text-amber-600 mb-2">
            Ajoutez au moins une photo pour pouvoir envoyer le rapport.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {photosPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
            <Camera className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-500 mt-1">Ajouter</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosChange}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {/* Signalement de degats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="degats"
            checked={degatsSignales}
            onChange={(e) => setDegatsSignales(e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            disabled={loading}
          />
          <label htmlFor="degats" className="flex items-center gap-2 text-sm text-gray-700">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Signaler des degats
          </label>
        </div>

        {degatsSignales && (
          <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <label htmlFor="degatsDescription" className="block text-sm font-medium text-red-700 mb-1">
                Description des degats *
              </label>
              <textarea
                id="degatsDescription"
                value={degatsDescription}
                onChange={(e) => setDegatsDescription(e.target.value)}
                rows={3}
                className="input-field border-red-300 focus:ring-red-500"
                placeholder="Decrivez les degats constates..."
                required={degatsSignales}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                Photos des degats
              </label>
              <div className="grid grid-cols-3 gap-2">
                {degatsPhotosPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Degat ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-red-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeDegatsPhoto(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-500 transition-colors">
                  <Camera className="w-6 h-6 text-red-400" />
                  <span className="text-xs text-red-500 mt-1">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleDegatsPhotosChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {showCancelButton && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={loading || !hasPhotos}
        >
          {loading && <Loader size="sm" className="border-white border-t-transparent" />}
          Envoyer le rapport
        </button>
      </div>
    </form>
  );
}
