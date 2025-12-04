import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Rapport, RapportInsert } from '../types';

export function useRapports() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRapport = useCallback(async (data: RapportInsert) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: newRapport, error: createError } = await supabase
        .from('rapports')
        .insert(data as never)
        .select()
        .single();

      if (createError) throw createError;

      return { data: newRapport as Rapport, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du rapport';
      setError(message);
      return { data: null, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRapportByIntervention = useCallback(async (interventionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('rapports')
        .select('*')
        .eq('intervention_id', interventionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      return { data: data as Rapport | null, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement du rapport';
      setError(message);
      return { data: null, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createRapport,
    getRapportByIntervention,
  };
}
