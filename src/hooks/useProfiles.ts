import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Profile, UserRole } from '../types';

interface UseProfilesOptions {
  role?: UserRole;
}

export function useProfiles(options: UseProfilesOptions = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('profiles').select('*');

      if (options.role) {
        query = query.eq('role', options.role);
      }

      const { data, error: fetchError } = await query.order('full_name');

      if (fetchError) throw fetchError;

      setProfiles(data as Profile[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      console.error('Erreur fetchProfiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.role]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Récupérer les clients uniquement
  const clients = profiles.filter((p) => p.role === 'client');

  // Récupérer les prestataires uniquement
  const prestataires = profiles.filter((p) => p.role === 'prestataire');

  return {
    profiles,
    clients,
    prestataires,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
}

// Hook spécifique pour les clients
export function useClients() {
  return useProfiles({ role: 'client' });
}

// Hook spécifique pour les prestataires
export function usePrestataires() {
  return useProfiles({ role: 'prestataire' });
}
