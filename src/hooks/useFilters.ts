import { useState, useEffect, useCallback } from 'react';

interface Filters {
  search: string;
  status: string;
  period: string;
  customDateStart: string;
  customDateEnd: string;
  logement: string;
  client: string;
  prestataire: string;
}

const defaultFilters: Filters = {
  search: '',
  status: '',
  period: 'all',
  customDateStart: '',
  customDateEnd: '',
  logement: '',
  client: '',
  prestataire: '',
};

export function useFilters(pageKey: string) {
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const saved = localStorage.getItem(`filters_${pageKey}`);
      return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(`filters_${pageKey}`, JSON.stringify(filters));
  }, [filters, pageKey]);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    localStorage.removeItem(`filters_${pageKey}`);
  }, [pageKey]);

  const hasActiveFilters = !!(filters.search || filters.status || filters.period !== 'all' ||
    filters.logement || filters.client || filters.prestataire);

  return {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  };
}
