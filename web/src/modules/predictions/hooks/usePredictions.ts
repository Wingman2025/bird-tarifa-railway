import { useState } from 'react';

import { getPredictions } from '../../../api/endpoints';
import type { PredictionOut, PredictionQuery } from '../../../api/types';

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: PredictionQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPredictions(query);
      setPredictions(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo calcular la prediccion.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return { predictions, loading, error, search };
}
