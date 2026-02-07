import { useState } from 'react';
import type { FormEvent } from 'react';

import { seedPredictionRules } from '../../../api/endpoints';
import type { HourBucket } from '../../../api/types';
import { AlertBanner } from '../../../shared/components/AlertBanner';
import { Card } from '../../../shared/components/Card';
import { parseMonth } from '../../../shared/utils/validation';
import { usePredictions } from '../hooks/usePredictions';

const HOUR_BUCKET_OPTIONS: { value: HourBucket; label: string }[] = [
  { value: 'dawn', label: 'Amanecer' },
  { value: 'morning', label: 'Manana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Atardecer/Noche' },
];

type PredictionFormProps = {
  predictionsApi: ReturnType<typeof usePredictions>;
};

export function PredictionForm({ predictionsApi }: PredictionFormProps) {
  const [zone, setZone] = useState('Tarifa Centro');
  const [monthInput, setMonthInput] = useState(String(new Date().getMonth() + 1));
  const [hourBucket, setHourBucket] = useState<HourBucket>('dawn');
  const [localError, setLocalError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSeedMessage(null);

    const month = parseMonth(monthInput);
    if (!month) {
      setLocalError('El mes debe ser un numero entre 1 y 12.');
      return;
    }

    if (!zone.trim()) {
      setLocalError('La zona es obligatoria.');
      return;
    }

    await predictionsApi.search({
      zone: zone.trim(),
      month,
      hour_bucket: hourBucket,
      limit: 10,
    });
  };

  const handleSeed = async () => {
    setSeedMessage(null);
    setLocalError(null);
    setSeeding(true);
    try {
      const result = await seedPredictionRules();
      setSeedMessage(`Reglas demo cargadas: ${result.inserted} insertadas.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar reglas demo.';
      setLocalError(message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card>
      <div className="card__header">
        <h2 className="section-title">Prediccion ligera</h2>
        <p className="section-subtitle">
          Consulta aves probables segun zona, mes y franja horaria.
        </p>
      </div>

      {localError ? <AlertBanner kind="error" message={localError} /> : null}
      {predictionsApi.error ? <AlertBanner kind="error" message={predictionsApi.error} /> : null}
      {seedMessage ? <AlertBanner kind="success" message={seedMessage} /> : null}

      <form className="form-grid form-grid--compact" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Zona</span>
          <input
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            maxLength={120}
            required
            disabled={predictionsApi.loading}
          />
        </label>

        <label className="field">
          <span className="field-label">Mes</span>
          <input
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
            inputMode="numeric"
            required
            disabled={predictionsApi.loading}
          />
        </label>

        <label className="field">
          <span className="field-label">Franja</span>
          <select
            value={hourBucket}
            onChange={(event) => setHourBucket(event.target.value as HourBucket)}
            disabled={predictionsApi.loading}
          >
            {HOUR_BUCKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions form-actions--split">
          <button className="btn btn--primary" type="submit" disabled={predictionsApi.loading}>
            {predictionsApi.loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button className="btn btn--soft" type="button" disabled={seeding} onClick={handleSeed}>
            {seeding ? 'Cargando...' : 'Cargar reglas demo'}
          </button>
        </div>
      </form>
    </Card>
  );
}
