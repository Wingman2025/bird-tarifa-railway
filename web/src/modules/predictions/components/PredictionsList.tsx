import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PredictionOut } from '../../../api/types';

type PredictionsListProps = {
  predictions: PredictionOut[];
  loading: boolean;
};

export function PredictionsList({ predictions, loading }: PredictionsListProps) {
  return (
    <Card>
      <div className="card__header">
        <h2 className="section-title">Aves probables</h2>
        <p className="section-subtitle">
          Ranking simple basado en reglas por zona, mes y franja.
        </p>
      </div>

      {loading ? <p className="loading-line">Calculando prediccion...</p> : null}

      {!loading && predictions.length === 0 ? (
        <EmptyState
          title="Sin resultados todavia."
          subtitle="Prueba otra zona o carga reglas demo para iniciar."
        />
      ) : null}

      <ol className="prediction-list">
        {predictions.map((prediction) => (
          <li key={`${prediction.species}-${prediction.score}`} className="prediction-item">
            <div>
              <p className="prediction-item__name">{prediction.species}</p>
              <p className="prediction-item__reason">{prediction.reason}</p>
            </div>
            <span className="prediction-item__score">{prediction.score}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
