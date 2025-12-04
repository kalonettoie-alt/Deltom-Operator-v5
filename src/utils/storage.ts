import { supabase } from '../config/supabase';

const BUCKET_NAME = 'photos';

/**
 * Upload une image vers Supabase Storage
 * @param file - Le fichier à uploader
 * @param folder - Le dossier de destination (ex: 'interventions', 'degats')
 * @returns L'URL publique de l'image ou null en cas d'erreur
 */
export async function uploadImage(file: File, folder: string): Promise<string | null> {
  try {
    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload le fichier
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      return null;
    }

    // Récupérer l'URL publique
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Erreur uploadImage:', error);
    return null;
  }
}

/**
 * Upload plusieurs images
 * @param files - Les fichiers à uploader
 * @param folder - Le dossier de destination
 * @returns Un tableau des URLs publiques
 */
export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadImage(file, folder);
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Supprime une image de Supabase Storage
 * @param url - L'URL publique de l'image
 * @returns true si la suppression a réussi
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    // Extraire le chemin du fichier depuis l'URL
    const urlParts = url.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Erreur suppression:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur deleteImage:', error);
    return false;
  }
}
