import { useCallback, useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';

interface UseBusinessDataResult<T> {
  data: T | undefined;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Fetches business-scoped data and automatically refetches when the selected
 * business changes (keyed off businessStore's switchToken), so screens never
 * show stale data from a previously selected business.
 */
export function useBusinessData<T>(
  fetcher: (businessId: string) => Promise<T>,
  deps: React.DependencyList = [],
): UseBusinessDataResult<T> {
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);
  const switchToken = useBusinessStore((s) => s.switchToken);
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!selectedBusiness) {
        setData(undefined);
        setLoading(false);
        return;
      }
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const result = await fetcher(selectedBusiness.id);
        setData(result);
      } catch (e: any) {
        setError(e.message ?? 'Something went wrong');
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBusiness?.id, switchToken, ...deps],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    reload: () => load(false),
  };
}
