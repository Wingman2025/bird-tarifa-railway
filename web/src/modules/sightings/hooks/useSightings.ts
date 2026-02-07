import { useCallback, useEffect, useState } from 'react';

import { listSightings } from '../../../api/endpoints';
import type { SightingOut } from '../../../api/types';

export function useSightings(limit = 50) {
  const [sightings, setSightings] = useState<SightingOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSightings(limit);
      setSightings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el historial.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sightings, loading, error, refresh };
}
