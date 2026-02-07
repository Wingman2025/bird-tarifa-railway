import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { AlertBanner } from '../../../shared/components/AlertBanner';
import { Card } from '../../../shared/components/Card';
import { toIsoOrNull } from '../../../shared/utils/datetime';
import type { SightingOut } from '../../../api/types';
import { useCreateSighting } from '../hooks/useCreateSighting';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PhotoPicker } from './PhotoPicker';

type SightingFormProps = {
  onCreated: (record: SightingOut) => void;
};

export function SightingForm({ onCreated }: SightingFormProps) {
  const [zone, setZone] = useState('Tarifa Centro');
  const [speciesGuess, setSpeciesGuess] = useState('');
  const [notes, setNotes] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const createSighting = useCreateSighting();
  const photoUpload = usePhotoUpload();

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isSubmitting = createSighting.loading || photoUpload.loading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    createSighting.setError(null);
    photoUpload.setError(null);

    if (!zone.trim()) {
      setLocalError('La zona es obligatoria.');
      return;
    }

    let uploadedKey: string | null = null;
    let uploadedUrl: string | null = null;

    try {
      if (selectedFile) {
        const uploadResult = await photoUpload.upload(selectedFile);
        uploadedKey = uploadResult.key;
        uploadedUrl = uploadResult.photo_url;
      }

      const created = await createSighting.submit({
        zone: zone.trim(),
        species_guess: speciesGuess.trim() || null,
        notes: notes.trim() || null,
        observed_at: toIsoOrNull(observedAt),
        photo_url: uploadedUrl,
      });

      setSpeciesGuess('');
      setNotes('');
      setObservedAt('');
      setSelectedFile(null);
      setSuccessMessage('Avistamiento guardado correctamente.');
      onCreated(created);
    } catch {
      if (uploadedKey) {
        await photoUpload.remove(uploadedKey);
      }
    }
  };

  return (
    <Card>
      <div className="card__header">
        <h2 className="section-title">Registrar avistamiento</h2>
        <p className="section-subtitle">
          Guarda tus salidas de campo con foto, contexto y especie estimada.
        </p>
      </div>

      {localError ? <AlertBanner kind="error" message={localError} /> : null}
      {createSighting.error ? <AlertBanner kind="error" message={createSighting.error} /> : null}
      {photoUpload.error ? <AlertBanner kind="error" message={photoUpload.error} /> : null}
      {successMessage ? <AlertBanner kind="success" message={successMessage} /> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Zona</span>
          <input
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            placeholder="Ej. Bolonia"
            maxLength={120}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="field">
          <span className="field-label">Especie (opcional)</span>
          <input
            value={speciesGuess}
            onChange={(event) => setSpeciesGuess(event.target.value)}
            placeholder="Ej. Milano negro"
            maxLength={120}
            disabled={isSubmitting}
          />
        </label>

        <label className="field">
          <span className="field-label">Fecha y hora (opcional)</span>
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(event) => setObservedAt(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Habitat, clima, comportamiento..."
            maxLength={2000}
            rows={4}
            disabled={isSubmitting}
          />
        </label>

        <div className="field field--full">
          <PhotoPicker
            file={selectedFile}
            previewUrl={previewUrl}
            onFileChange={setSelectedFile}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar avistamiento'}
          </button>
        </div>
      </form>
    </Card>
  );
}
