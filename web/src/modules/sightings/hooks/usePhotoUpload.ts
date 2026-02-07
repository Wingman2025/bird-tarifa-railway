import { useState } from 'react';

import { deletePhoto, uploadPhoto } from '../../../api/endpoints';
import type { PhotoUploadOut } from '../../../api/types';

export function usePhotoUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<PhotoUploadOut> => {
    setLoading(true);
    setError(null);
    try {
      return await uploadPhoto(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo subir la foto.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (key: string) => {
    try {
      await deletePhoto(key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo limpiar el archivo temporal.';
      setError(message);
    }
  };

  return { upload, remove, loading, error, setError };
}
