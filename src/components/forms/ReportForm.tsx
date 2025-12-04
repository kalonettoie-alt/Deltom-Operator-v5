import { useState } from 'react';
import { Camera, X, AlertTriangle } from 'lucide-react';
import { Loader } from '../ui/Loader';
import { uploadImages } from '../../utils/storage';
import type { RapportInsert } from '../../types';

interface ReportFormProps {
  interventionId: string;
  onSubmit: (data: RapportInsert) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ReportForm({
  interventionId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReportFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [degatsSignales, setDegatsSignales] = useState(false);
  const [degatsDescription, setDegatsDescription] = useState('');
  const [degatsPhotos, setDegatsPhotos] = useState<File[]>([]);
  const [degatsPhotosPreviews, setDegatsPhotosPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);

    // Créer les previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotosPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDegatsPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDegatsPhotos((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDegatsPhotosPreviews((prev) => [...prev, e.target?.result as string]);
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

    try {
      // Upload des photos
      const photosUrls = await uploadImages(photos, 'interventions');
      const degatsPhotosUrls = degatsSignales
        ? await uploadImages(degatsPhotos, 'degats')
        : [];

      await onSubmit({
        intervention_id: interventionId,
        photos_intervention: photosUrls,
        degats_signales: degatsSignales,
        degats_description: degatsSignales ? degatsDescription : null,
        degats_photos: degatsPhotosUrls,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loading = isSubmitting || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photos de l'intervention */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos du ménage terminé
        </label>
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

      {/* Signalement de dégâts */}
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
            Signaler des dégâts
          </label>
        </div>

        {degatsSignales && (
          <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <label htmlFor="degatsDescription" className="block text-sm font-medium text-red-700 mb-1">
                Description des dégâts *
              </label>
              <textarea
                id="degatsDescription"
                value={degatsDescription}
                onChange={(e) => setDegatsDescription(e.target.value)}
                rows={3}
                className="input-field border-red-300 focus:ring-red-500"
                placeholder="Décrivez les dégâts constatés..."
                required={degatsSignales}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                Photos des dégâts
              </label>
              <div className="grid grid-cols-3 gap-2">
                {degatsPhotosPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Dégât ${index + 1}`}
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
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={loading}
        >
          {loading && <Loader size="sm" className="border-white border-t-transparent" />}
          Envoyer le rapport
        </button>
      </div>
    </form>
  );
}
