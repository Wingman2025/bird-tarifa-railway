import { useState } from 'react';

import { createSighting } from '../../../api/endpoints';
import type { SightingCreateInput, SightingOut } from '../../../api/types';

export function useCreateSighting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (payload: SightingCreateInput): Promise<SightingOut> => {
    setLoading(true);
    setError(null);
    try {
      return await createSighting(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el avistamiento.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error, setError };
}
