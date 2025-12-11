import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type {
  Intervention,
  InterventionInsert,
  InterventionUpdate,
  InterventionWithRelations,
  InterventionStatus,
} from '../types';

interface UseInterventionsOptions {
  clientId?: string;
  prestataireId?: string;
  status?: InterventionStatus;
  date?: string;
  withRelations?: boolean;
}

export function useInterventions(options: UseInterventionsOptions = {}) {
  const [interventions, setInterventions] = useState<InterventionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterventions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('interventions').select(
        options.withRelations !== false
          ? `*,
             logement:logements(*),
             client:profiles!interventions_client_id_fkey(*),
             prestataire:profiles!interventions_prestataire_id_fkey(*),
             rapport:rapports(*)`
          : '*'
      );

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      if (options.prestataireId) {
        query = query.eq('prestataire_id', options.prestataireId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.date) {
        query = query.eq('date', options.date);
      }

      const { data, error: fetchError } = await query.order('date', { ascending: false });

      if (fetchError) throw fetchError;

      // Supabase retourne rapport comme un tableau, on prend le premier élément pour chaque intervention
      const interventionsData = (data as (InterventionWithRelations & { rapport: unknown })[]).map(item => {
        if (Array.isArray(item.rapport)) {
          item.rapport = item.rapport[0] || null;
        }
        return item;
      });

      setInterventions(interventionsData as InterventionWithRelations[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      console.error('Erreur fetchInterventions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.clientId, options.prestataireId, options.status, options.date, options.withRelations]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  // ============================================================
  // MÉTHODES ADMIN - UPDATE direct (autorisé par RLS admin)
  // ============================================================

  const createIntervention = async (data: InterventionInsert) => {
    try {
      const { data: newIntervention, error: createError } = await supabase
        .from('interventions')
        .insert(data as never)
        .select()
        .single();

      if (createError) throw createError;

      await fetchInterventions();
      return { data: newIntervention as Intervention, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      return { data: null, error: message };
    }
  };

  const updateIntervention = async (id: string, data: InterventionUpdate) => {
    try {
      const { data: updatedIntervention, error: updateError } = await supabase
        .from('interventions')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchInterventions();
      return { data: updatedIntervention as Intervention, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      return { data: null, error: message };
    }
  };

  const deleteIntervention = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('interventions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchInterventions();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      return { error: message };
    }
  };

  // ============================================================
  // MÉTHODES PRESTATAIRE - Utilisant RPC (SECURITY DEFINER)
  // Ces fonctions contournent le RLS pour les actions prestataire
  // ============================================================

  const acceptIntervention = async (id: string) => {
    try {
      console.log('[RPC] Appel accepter_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('accepter_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) {
        console.error('[RPC] Erreur accepter_intervention:', rpcError);
        throw rpcError;
      }

      console.log('[RPC] Résultat accepter_intervention:', data);

      // Vérifier si la fonction a retourné une erreur
      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'acceptation');
      }

      await fetchInterventions();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation';
      console.error('Erreur acceptIntervention:', err);
      return { data: null, error: message };
    }
  };

  const refuseIntervention = async (id: string) => {
    try {
      console.log('[RPC] Appel refuser_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('refuser_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) {
        console.error('[RPC] Erreur refuser_intervention:', rpcError);
        throw rpcError;
      }

      console.log('[RPC] Résultat refuser_intervention:', data);

      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors du refus');
      }

      await fetchInterventions();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du refus';
      console.error('Erreur refuseIntervention:', err);
      return { data: null, error: message };
    }
  };

  const startIntervention = async (id: string) => {
    try {
      console.log('[RPC] Appel commencer_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('commencer_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) {
        console.error('[RPC] Erreur commencer_intervention:', rpcError);
        throw rpcError;
      }

      console.log('[RPC] Résultat commencer_intervention:', data);

      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors du démarrage');
      }

      await fetchInterventions();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du démarrage';
      console.error('Erreur startIntervention:', err);
      return { data: null, error: message };
    }
  };

  const completeIntervention = async (id: string) => {
    try {
      console.log('[RPC] Appel terminer_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('terminer_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) {
        console.error('[RPC] Erreur terminer_intervention:', rpcError);
        throw rpcError;
      }

      console.log('[RPC] Résultat terminer_intervention:', data);

      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors de la finalisation');
      }

      await fetchInterventions();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la finalisation';
      console.error('Erreur completeIntervention:', err);
      return { data: null, error: message };
    }
  };

  return {
    interventions,
    isLoading,
    error,
    refetch: fetchInterventions,
    // Méthodes admin
    createIntervention,
    updateIntervention,
    deleteIntervention,
    // Méthodes prestataire (RPC)
    acceptIntervention,
    refuseIntervention,
    startIntervention,
    completeIntervention,
  };
}

// Hook pour récupérer une intervention spécifique
export function useIntervention(id: string) {
  const [intervention, setIntervention] = useState<InterventionWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntervention = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('interventions')
        .select(
          `*,
           logement:logements(*),
           client:profiles!interventions_client_id_fkey(*),
           prestataire:profiles!interventions_prestataire_id_fkey(*),
           rapport:rapports(*)`
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Supabase retourne rapport comme un tableau, on prend le premier élément
      const interventionData = data as InterventionWithRelations & { rapport: unknown };
      if (Array.isArray(interventionData.rapport)) {
        interventionData.rapport = interventionData.rapport[0] || null;
      }

      setIntervention(interventionData as InterventionWithRelations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      console.error('Erreur fetchIntervention:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIntervention();
  }, [fetchIntervention]);

  // ============================================================
  // MÉTHODES PRESTATAIRE - Utilisant RPC (SECURITY DEFINER)
  // ============================================================

  const acceptIntervention = async () => {
    try {
      console.log('[RPC] Appel accepter_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('accepter_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'acceptation');
      }

      await fetchIntervention();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation';
      return { data: null, error: message };
    }
  };

  const refuseIntervention = async () => {
    try {
      console.log('[RPC] Appel refuser_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('refuser_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors du refus');
      }

      await fetchIntervention();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du refus';
      return { data: null, error: message };
    }
  };

  const startIntervention = async () => {
    try {
      console.log('[RPC] Appel commencer_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('commencer_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors du démarrage');
      }

      await fetchIntervention();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du démarrage';
      return { data: null, error: message };
    }
  };

  const completeIntervention = async () => {
    try {
      console.log('[RPC] Appel terminer_intervention:', id);
      const { data, error: rpcError } = await supabase.rpc('terminer_intervention' as never, {
        p_intervention_id: id,
      } as never);

      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; error?: string } | null;
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erreur lors de la finalisation');
      }

      await fetchIntervention();
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la finalisation';
      return { data: null, error: message };
    }
  };

  return {
    intervention,
    isLoading,
    error,
    refetch: fetchIntervention,
    // Méthodes prestataire (RPC)
    acceptIntervention,
    refuseIntervention,
    startIntervention,
    completeIntervention,
  };
}
