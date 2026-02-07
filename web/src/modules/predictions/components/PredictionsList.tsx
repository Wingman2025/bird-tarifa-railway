import { EmptyState } from '../../../shared/components/EmptyState';
import type { PredictionOut } from '../../../api/types';

function formatLastSeen(daysAgo: number | null): string | null {
  if (daysAgo === null) return null;
  if (daysAgo <= 0) return 'Hoy';
  if (daysAgo === 1) return 'Ayer';
  return `Hace ${daysAgo} días`;
}

function formatReportCount(count: number | null): string | null {
  if (count === null) return null;
  if (count === 1) return '1 reporte';
  return `${count} reportes`;
}

function buildMetaText(prediction: PredictionOut): string | null {
  const parts = [
    formatLastSeen(prediction.last_seen_days_ago),
    formatReportCount(prediction.observations_count),
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

type PredictionsListProps = {
  predictions: PredictionOut[];
  loading: boolean;
  onSelectSpecies?: (species: string) => void;
};

export function PredictionsList({ predictions, loading, onSelectSpecies }: PredictionsListProps) {
  const top = predictions.slice(0, 3);
  const rest = predictions.slice(3);
  const confidence = predictions[0]?.confidence;
  const fallbackUsed = predictions[0]?.fallback_used;

  const confidenceLabel =
    confidence === 'high' ? 'Alta' : confidence === 'medium' ? 'Media' : confidence === 'low' ? 'Baja' : null;

  return (
    <section className="panel panel--results">
      <header className="panel__head">
        <div className="panel__title-row">
          <h3 className="panel__title">Aves probables</h3>
          {confidenceLabel ? (
            <span
              className={`badge badge--${confidence}`}
              title={fallbackUsed ? 'Se aplicó fallback por falta de datos exactos.' : 'Datos exactos.'}
            >
              Confianza: {confidenceLabel}
              {fallbackUsed ? ' (fallback)' : ''}
            </span>
          ) : null}
        </div>
        <p className="panel__subtitle">Ranking simple basado en reglas (o eBird si no hay reglas).</p>
      </header>

      {loading ? <p className="loading-line">Calculando predicción...</p> : null}

      {!loading && predictions.length === 0 ? (
        <EmptyState
          title="Sin resultados todavía."
          subtitle="Prueba otra zona o usa Demo para cargar reglas."
        />
      ) : null}

      {top.length ? (
        <div className="leaderboard" aria-label="Top resultados">
          {top.map((prediction, index) => {
            const metaText = buildMetaText(prediction);
            return (
              <button
                key={`${prediction.species}-${prediction.score}`}
                className={`leaderboard__card ${index === 0 ? 'leaderboard__card--top' : ''}`}
                type="button"
                onClick={() => onSelectSpecies?.(prediction.species)}
                disabled={!onSelectSpecies}
                title={onSelectSpecies ? 'Ver foto y ficha' : undefined}
              >
                <div className="leaderboard__rank" aria-hidden="true">
                  {index + 1}
                </div>
                <div className="leaderboard__body">
                  <h4 className="leaderboard__name">{prediction.species}</h4>
                  {metaText ? <p className="leaderboard__meta">{metaText}</p> : null}
                  <p className="leaderboard__reason">{prediction.reason}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {rest.length ? (
        <ol className="prediction-list" aria-label="Más resultados">
          {rest.map((prediction) => {
            const metaText = buildMetaText(prediction);
            return (
              <li key={`${prediction.species}-${prediction.score}`}>
                <button
                  type="button"
                  className="prediction-item"
                  onClick={() => onSelectSpecies?.(prediction.species)}
                  disabled={!onSelectSpecies}
                  title={onSelectSpecies ? 'Ver foto y ficha' : undefined}
                >
                  <div>
                    <p className="prediction-item__name">{prediction.species}</p>
                    {metaText ? <p className="prediction-item__meta">{metaText}</p> : null}
                    <p className="prediction-item__reason">{prediction.reason}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

