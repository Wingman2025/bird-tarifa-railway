import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { seedPredictionRules } from '../../../api/endpoints';
import type { HourBucket } from '../../../api/types';
import { AlertBanner } from '../../../shared/components/AlertBanner';
import { parseMonth } from '../../../shared/utils/validation';
import { usePredictions } from '../hooks/usePredictions';

const ZONE_OPTIONS = ['Tarifa Centro', 'Tarifa', 'Bolonia'] as const;
type ZoneOption = (typeof ZONE_OPTIONS)[number] | 'custom';

const HOUR_BUCKET_OPTIONS: { value: HourBucket; label: string }[] = [
  { value: 'dawn', label: 'Amanecer' },
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Atardecer/Noche' },
];

type PredictionFormProps = {
  predictionsApi: ReturnType<typeof usePredictions>;
};

function inferZoneOption(value: string): { option: ZoneOption; custom: string } {
  const trimmed = value.trim();
  if (!trimmed) return { option: 'Tarifa Centro', custom: '' };

  if ((ZONE_OPTIONS as readonly string[]).includes(trimmed)) {
    return { option: trimmed as ZoneOption, custom: '' };
  }

  return { option: 'custom', custom: trimmed };
}

export function PredictionForm({ predictionsApi }: PredictionFormProps) {
  const [zoneOption, setZoneOption] = useState<ZoneOption>(() => {
    const stored = localStorage.getItem('bt_zone') || 'Tarifa Centro';
    return inferZoneOption(stored).option;
  });
  const [customZone, setCustomZone] = useState(() => {
    const stored = localStorage.getItem('bt_zone') || '';
    return inferZoneOption(stored).custom;
  });
  const [monthInput, setMonthInput] = useState(String(new Date().getMonth() + 1));
  const [hourBucket, setHourBucket] = useState<HourBucket>('dawn');
  const [localError, setLocalError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const effectiveZone = zoneOption === 'custom' ? customZone : zoneOption;

  useEffect(() => {
    const value = effectiveZone.trim();
    if (!value) return;
    localStorage.setItem('bt_zone', value);
  }, [effectiveZone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSeedMessage(null);

    const month = parseMonth(monthInput);
    if (!month) {
      setLocalError('El mes debe ser un número entre 1 y 12.');
      return;
    }

    if (!effectiveZone.trim()) {
      setLocalError('La zona es obligatoria.');
      return;
    }

    await predictionsApi.search({
      zone: effectiveZone.trim(),
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
            <select
              value={zoneOption}
              onChange={(event) => setZoneOption(event.target.value as ZoneOption)}
              disabled={predictionsApi.loading}
            >
              {ZONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="custom">Otra zona...</option>
            </select>
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

        {zoneOption === 'custom' ? (
          <label className="field predictor__field">
            <span className="field-label">Nombre de zona</span>
            <input
              value={customZone}
              onChange={(event) => setCustomZone(event.target.value)}
              maxLength={120}
              required
              disabled={predictionsApi.loading}
              placeholder="Ej. Los Lances"
            />
          </label>
        ) : null}

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

