import { useState } from 'react';
import { Camera, X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadImages } from '../../utils/storage';
import { Loader } from '../ui/Loader';

interface EtatDesLieuxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photos: string[]) => Promise<void>;
  interventionId: string;
}

const MIN_PHOTOS = 2;

export const EtatDesLieuxModal = ({ isOpen, onClose, onSubmit, interventionId }: EtatDesLieuxModalProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

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

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length < MIN_PHOTOS) return;

    setIsSubmitting(true);
    setError(null);

    try {
      setIsUploading(true);
      // Upload des photos vers Supabase Storage
      const uploadedUrls = await uploadImages(photos, `etat-lieux/${interventionId}`);
      setIsUploading(false);

      // Appeler le callback avec les URLs
      await onSubmit(uploadedUrls);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      setError(message);
      console.error('Erreur upload etat des lieux:', err);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPhotos([]);
      setPhotosPreviews([]);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white w-full h-[90vh] md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-semibold text-lg">Etat des lieux d'entree</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Prenez des photos avant de commencer</p>
                <p className="text-sm text-blue-700 mt-1">
                  Photographiez l'etat general du logement (minimum {MIN_PHOTOS} photos).
                  Ces photos serviront de preuve en cas de litige.
                </p>
              </div>
            </div>
          </div>

          {/* Zone d'upload */}
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={isSubmitting}
            />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-700">
              {isUploading ? 'Telechargement...' : 'Ajouter des photos'}
            </p>
            <p className="text-sm text-gray-500">Cliquez ou prenez une photo</p>
          </label>

          {/* Photos uploadees */}
          {photosPreviews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Photos ajoutees ({photosPreviews.length}/{MIN_PHOTOS} minimum)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photosPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      disabled={isSubmitting}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation */}
          <div className="mt-4 flex items-center gap-2">
            {photos.length >= MIN_PHOTOS ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            )}
            <span className={photos.length >= MIN_PHOTOS ? 'text-green-600' : 'text-orange-600'}>
              {photos.length >= MIN_PHOTOS
                ? 'Vous pouvez commencer l\'intervention'
                : `Ajoutez encore ${MIN_PHOTOS - photos.length} photo(s)`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={handleSubmit}
            disabled={photos.length < MIN_PHOTOS || isSubmitting}
            className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              photos.length >= MIN_PHOTOS && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting && <Loader size="sm" className="border-white border-t-transparent" />}
            {isSubmitting ? 'Demarrage...' : 'Commencer l\'intervention'}
          </button>
        </div>
      </div>
    </div>
  );
};
