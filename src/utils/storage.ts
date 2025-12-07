import { supabase } from '../config/supabase';

const BUCKET_NAME = 'intervention-reports';

/**
 * Upload une image vers Supabase Storage
 * @param file - Le fichier à uploader
 * @param folder - Le dossier de destination (ex: 'interventions', 'degats')
 * @returns L'URL publique de l'image
 * @throws Error si l'upload échoue
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  // Générer un nom de fichier unique
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  console.log(`[Upload] Début upload: ${file.name} -> ${fileName}`);

  // Upload le fichier
  const { data, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[Upload] Erreur upload:', uploadError);
    throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
  }

  console.log('[Upload] Upload réussi:', data);

  // Récupérer l'URL publique
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  console.log('[Upload] URL publique:', urlData.publicUrl);

  return urlData.publicUrl;
}

/**
 * Upload plusieurs images
 * @param files - Les fichiers à uploader
 * @param folder - Le dossier de destination
 * @returns Un tableau des URLs publiques
 * @throws Error si un upload échoue
 */
export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  console.log(`[Upload] Début upload de ${files.length} fichier(s) vers ${folder}`);

  if (files.length === 0) {
    console.log('[Upload] Aucun fichier à uploader');
    return [];
  }

  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadImage(file, folder);
    urls.push(url);
  }

  console.log(`[Upload] Upload terminé. ${urls.length} URL(s) générée(s):`, urls);

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
