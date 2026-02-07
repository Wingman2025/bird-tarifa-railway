import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { AlertBanner } from '../../../shared/components/AlertBanner';
import { toIsoOrNull } from '../../../shared/utils/datetime';
import type { SightingOut } from '../../../api/types';
import { useCreateSighting } from '../hooks/useCreateSighting';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { PhotoPicker } from './PhotoPicker';

type SightingComposerProps = {
  onCreated: (record: SightingOut) => void;
  onClose: () => void;
};

type Step = 1 | 2;

export function SightingComposer({ onCreated, onClose }: SightingComposerProps) {
  const [step, setStep] = useState<Step>(1);
  const [zone, setZone] = useState(() => localStorage.getItem('bt_zone') || 'Tarifa Centro');
  const [speciesGuess, setSpeciesGuess] = useState('');
  const [notes, setNotes] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const createSighting = useCreateSighting();
  const photoUpload = usePhotoUpload();

  useEffect(() => {
    localStorage.setItem('bt_zone', zone);
  }, [zone]);

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
      setStep(1);
      setSuccessMessage('Avistamiento guardado.');
      onCreated(created);
    } catch {
      if (uploadedKey) {
        await photoUpload.remove(uploadedKey);
      }
    }
  };

  return (
    <div className="composer">
      <div className="composer__progress" aria-label="Progreso">
        <span className={`composer__dot ${step === 1 ? 'composer__dot--active' : ''}`} />
        <span className={`composer__dot ${step === 2 ? 'composer__dot--active' : ''}`} />
      </div>

      {localError ? <AlertBanner kind="error" message={localError} /> : null}
      {createSighting.error ? <AlertBanner kind="error" message={createSighting.error} /> : null}
      {photoUpload.error ? <AlertBanner kind="error" message={photoUpload.error} /> : null}
      {successMessage ? <AlertBanner kind="success" message={successMessage} /> : null}

      {step === 1 ? (
        <div className="composer__step">
          <p className="composer__lead">Foto (opcional)</p>
          <PhotoPicker
            file={selectedFile}
            previewUrl={previewUrl}
            onFileChange={setSelectedFile}
            disabled={isSubmitting}
          />
          <div className="composer__actions composer__actions--split">
            <button className="btn btn--soft" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <form className="composer__step" onSubmit={handleSubmit}>
          <div className="composer__summary">
            {previewUrl ? (
              <button
                type="button"
                className="composer__thumb"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                aria-label="Cambiar foto"
              >
                <img src={previewUrl} alt="Foto seleccionada" />
                <span className="composer__thumb-label">Cambiar</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--soft"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Añadir foto
              </button>
            )}
            <div className="composer__summary-text">
              <p className="composer__lead">Detalles</p>
              <p className="composer__hint">Solo lo esencial. Lo demás es opcional.</p>
            </div>
          </div>

          <div className="composer__fields">
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
                placeholder="Hábitat, clima, comportamiento..."
                maxLength={2000}
                rows={4}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="composer__actions composer__actions--split">
            <button
              className="btn btn--soft"
              type="button"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              Atrás
            </button>
            <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

