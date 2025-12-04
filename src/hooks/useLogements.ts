import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Logement, LogementInsert, LogementUpdate, LogementWithClient } from '../types';

interface UseLogementsOptions {
  clientId?: string;
  withClient?: boolean;
}

export function useLogements(options: UseLogementsOptions = {}) {
  const [logements, setLogements] = useState<(Logement | LogementWithClient)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('logements').select(
        options.withClient
          ? `*, client:profiles!logements_client_id_fkey(*)`
          : '*'
      );

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLogements(data as (Logement | LogementWithClient)[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      console.error('Erreur fetchLogements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.clientId, options.withClient]);

  useEffect(() => {
    fetchLogements();
  }, [fetchLogements]);

  const createLogement = async (data: LogementInsert) => {
    try {
      const { data: newLogement, error: createError } = await supabase
        .from('logements')
        .insert(data as never)
        .select()
        .single();

      if (createError) throw createError;

      await fetchLogements();
      return { data: newLogement as Logement, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      return { data: null, error: message };
    }
  };

  const updateLogement = async (id: string, data: LogementUpdate) => {
    try {
      const { data: updatedLogement, error: updateError } = await supabase
        .from('logements')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchLogements();
      return { data: updatedLogement as Logement, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      return { data: null, error: message };
    }
  };

  const deleteLogement = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('logements')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchLogements();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      return { error: message };
    }
  };

  return {
    logements: logements as LogementWithClient[],
    isLoading,
    error,
    refetch: fetchLogements,
    createLogement,
    updateLogement,
    deleteLogement,
  };
}
