import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { listZones, seedPredictionRules } from '../../../api/endpoints';
import type { HourBucket, ZoneOut } from '../../../api/types';
import { AlertBanner } from '../../../shared/components/AlertBanner';
import { parseMonth } from '../../../shared/utils/validation';
import { usePredictions } from '../hooks/usePredictions';

type ZoneValue = string | 'custom';

const HOUR_BUCKET_OPTIONS: { value: HourBucket; label: string }[] = [
  { value: 'dawn', label: 'Amanecer' },
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Atardecer/Noche' },
];

type PredictionFormProps = {
  predictionsApi: ReturnType<typeof usePredictions>;
};

function getInitialZoneValue(): ZoneValue {
  const storedValue = localStorage.getItem('bt_zone_value');
  if (storedValue) return storedValue as ZoneValue;

  const legacy = localStorage.getItem('bt_zone');
  if (legacy && legacy.trim()) return 'custom';

  return 'geo';
}

function getInitialCustomZone(): string {
  const storedCustom = localStorage.getItem('bt_zone_custom');
  if (storedCustom) return storedCustom;

  const legacy = localStorage.getItem('bt_zone');
  return (legacy || '').trim();
}

export function PredictionForm({ predictionsApi }: PredictionFormProps) {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [zoneValue, setZoneValue] = useState<ZoneValue>(() => getInitialZoneValue());
  const [customZone, setCustomZone] = useState(() => getInitialCustomZone());

  const [monthInput, setMonthInput] = useState(String(new Date().getMonth() + 1));
  const [hourBucket, setHourBucket] = useState<HourBucket>('dawn');
  const [localError, setLocalError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === zoneValue) ?? null, [zones, zoneValue]);
  const effectiveZoneLabel = zoneValue === 'custom' ? customZone : selectedZone?.name ?? '';
  const effectiveZoneId = zoneValue === 'custom' ? null : zoneValue;

  const geoZones = useMemo(() => zones.filter((zone) => zone.kind === 'geo'), [zones]);
  const hotspotZones = useMemo(() => zones.filter((zone) => zone.kind === 'hotspot'), [zones]);

  useEffect(() => {
    localStorage.setItem('bt_zone_value', String(zoneValue));
  }, [zoneValue]);

  useEffect(() => {
    localStorage.setItem('bt_zone_custom', customZone);
  }, [customZone]);

  useEffect(() => {
    let cancelled = false;
    setZonesLoading(true);
    setZonesError(null);

    listZones()
      .then((data) => {
        if (cancelled) return;
        setZones(data);

        setZoneValue((current) => {
          if (current === 'custom') return current;
          const stillValid = data.some((zone) => zone.id === current);
          return stillValid ? current : 'geo';
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'No se pudieron cargar zonas eBird.';
        setZonesError(message);
        setZones([{ id: 'geo', name: 'Tarifa (zona general)', kind: 'geo' }]);
        setZoneValue((current) => (current === 'custom' ? current : 'geo'));
      })
      .finally(() => {
        if (cancelled) return;
        setZonesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSeedMessage(null);

    const month = parseMonth(monthInput);
    if (!month) {
      setLocalError('El mes debe ser un número entre 1 y 12.');
      return;
    }

    if (!effectiveZoneLabel.trim()) {
      setLocalError('La zona es obligatoria.');
      return;
    }

    await predictionsApi.search({
      zone: effectiveZoneLabel.trim(),
      zone_id: effectiveZoneId,
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
        <p className="panel__subtitle">Zonas sugeridas por eBird para evitar granularidad innecesaria.</p>
      </header>

      {localError ? <AlertBanner kind="error" message={localError} /> : null}
      {zonesError ? <AlertBanner kind="info" message={zonesError} /> : null}
      {predictionsApi.error ? <AlertBanner kind="error" message={predictionsApi.error} /> : null}
      {seedMessage ? <AlertBanner kind="success" message={seedMessage} /> : null}

      <form className="predictor" onSubmit={handleSubmit}>
        <div className="predictor__row">
          <label className="field predictor__field predictor__field--grow">
            <span className="field-label">Zona</span>
            <select
              value={zoneValue}
              onChange={(event) => setZoneValue(event.target.value as ZoneValue)}
              disabled={predictionsApi.loading || zonesLoading}
            >
              {geoZones.length ? (
                <optgroup label="Zona general">
                  {geoZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}

              {hotspotZones.length ? (
                <optgroup label="Hotspots eBird">
                  {hotspotZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}

              <optgroup label="Manual">
                <option value="custom">Otra zona...</option>
              </optgroup>
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

        {zoneValue === 'custom' ? (
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
