import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { seedPredictionRules } from '../../../api/endpoints';
import type { HourBucket } from '../../../api/types';
import { AlertBanner } from '../../../shared/components/AlertBanner';
import { parseMonth } from '../../../shared/utils/validation';
import { usePredictions } from '../hooks/usePredictions';

const HOUR_BUCKET_OPTIONS: { value: HourBucket; label: string }[] = [
  { value: 'dawn', label: 'Amanecer' },
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Atardecer/Noche' },
];

type PredictionFormProps = {
  predictionsApi: ReturnType<typeof usePredictions>;
};

export function PredictionForm({ predictionsApi }: PredictionFormProps) {
  const [zone, setZone] = useState(() => localStorage.getItem('bt_zone') || 'Tarifa Centro');
  const [monthInput, setMonthInput] = useState(String(new Date().getMonth() + 1));
  const [hourBucket, setHourBucket] = useState<HourBucket>('dawn');
  const [localError, setLocalError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    localStorage.setItem('bt_zone', zone);
  }, [zone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSeedMessage(null);

    const month = parseMonth(monthInput);
    if (!month) {
      setLocalError('El mes debe ser un número entre 1 y 12.');
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
    <section className="panel panel--predict">
      <header className="panel__head">
        <h3 className="panel__title">Ajustes</h3>
        <p className="panel__subtitle">Zona, mes y franja. Sin complicaciones.</p>
      </header>

      {localError ? <AlertBanner kind="error" message={localError} /> : null}
      {predictionsApi.error ? <AlertBanner kind="error" message={predictionsApi.error} /> : null}
      {seedMessage ? <AlertBanner kind="success" message={seedMessage} /> : null}

      <form className="predictor" onSubmit={handleSubmit}>
        <div className="predictor__row">
          <label className="field predictor__field predictor__field--grow">
            <span className="field-label">Zona</span>
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              maxLength={120}
              required
              disabled={predictionsApi.loading}
              placeholder="Ej. Bolonia"
            />
          </label>

          <label className="field predictor__field predictor__month">
            <span className="field-label">Mes</span>
            <input
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              inputMode="numeric"
              required
              disabled={predictionsApi.loading}
            />
          </label>
        </div>

        <div className="predictor__chips" aria-label="Franja horaria">
          {HOUR_BUCKET_OPTIONS.map((option) => {
            const isActive = hourBucket === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`chip ${isActive ? 'chip--active' : ''}`}
                onClick={() => setHourBucket(option.value)}
                aria-pressed={isActive}
                disabled={predictionsApi.loading}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="predictor__actions">
          <button className="btn btn--primary" type="submit" disabled={predictionsApi.loading}>
            {predictionsApi.loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button className="btn btn--ghost" type="button" disabled={seeding} onClick={handleSeed}>
            {seeding ? 'Cargando...' : 'Demo'}
          </button>
        </div>
      </form>
    </section>
  );
}
