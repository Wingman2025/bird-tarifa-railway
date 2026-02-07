import { AlertBanner } from '../../../shared/components/AlertBanner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { formatDateTime } from '../../../shared/utils/datetime';
import type { SightingOut } from '../../../api/types';

type SightingsListProps = {
  sightings: SightingOut[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function SightingsList({
  sightings,
  loading,
  error,
  onRefresh,
}: SightingsListProps) {
  return (
    <section className="panel panel--feed">
      <header className="panel__head panel__head--row">
        <div>
          <h3 className="panel__title">Últimos registros</h3>
          <p className="panel__subtitle">Historial reciente de tus salidas.</p>
        </div>
        <button className="btn btn--ghost" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Actualizando...' : 'Refrescar'}
        </button>
      </header>

      {error ? <AlertBanner kind="error" message={error} /> : null}

      {!loading && sightings.length === 0 ? (
        <EmptyState
          title="Aún no hay avistamientos."
          subtitle="Pulsa + para registrar tu primera salida."
        />
      ) : null}

      <div className="feed" aria-label="Lista de avistamientos">
        {sightings.map((item) => (
          <article className="feed-card" key={item.id}>
            {item.photo_url ? (
              <a
                href={item.photo_url}
                target="_blank"
                rel="noreferrer"
                className="feed-card__photo"
              >
                <img
                  src={item.photo_url}
                  alt={`Foto de ${item.species_guess || 'avistamiento'}`}
                  loading="lazy"
                />
              </a>
            ) : (
              <div className="feed-card__photo feed-card__photo--empty">Sin foto</div>
            )}

            <div className="feed-card__body">
              <h4 className="feed-card__title">{item.species_guess || 'Especie sin nombre'}</h4>
              <p className="feed-card__meta">
                <span className="meta-chip">{item.zone}</span>
                <span className="meta-dot" aria-hidden="true">
                  ·
                </span>
                <time dateTime={item.observed_at}>{formatDateTime(item.observed_at)}</time>
              </p>
              {item.notes ? <p className="feed-card__notes">{item.notes}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

