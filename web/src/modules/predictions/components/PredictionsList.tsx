import { EmptyState } from '../../../shared/components/EmptyState';
import type { PredictionOut } from '../../../api/types';

type PredictionsListProps = {
  predictions: PredictionOut[];
  loading: boolean;
};

export function PredictionsList({ predictions, loading }: PredictionsListProps) {
  const top = predictions.slice(0, 3);
  const rest = predictions.slice(3);

  return (
    <section className="panel panel--results">
      <header className="panel__head">
        <h3 className="panel__title">Aves probables</h3>
        <p className="panel__subtitle">Ranking simple basado en reglas.</p>
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
          {top.map((prediction, index) => (
            <article
              key={`${prediction.species}-${prediction.score}`}
              className={`leaderboard__card ${index === 0 ? 'leaderboard__card--top' : ''}`}
            >
              <div className="leaderboard__rank" aria-hidden="true">
                {index + 1}
              </div>
              <div className="leaderboard__body">
                <h4 className="leaderboard__name">{prediction.species}</h4>
                <p className="leaderboard__reason">{prediction.reason}</p>
              </div>
              <div className="leaderboard__score" aria-label={`Puntaje ${prediction.score}`}>
                {prediction.score}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {rest.length ? (
        <ol className="prediction-list" aria-label="Más resultados">
          {rest.map((prediction) => (
            <li key={`${prediction.species}-${prediction.score}`} className="prediction-item">
              <div>
                <p className="prediction-item__name">{prediction.species}</p>
                <p className="prediction-item__reason">{prediction.reason}</p>
              </div>
              <span className="prediction-item__score">{prediction.score}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
