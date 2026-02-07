import { AlertBanner } from '../../../shared/components/AlertBanner';
import { Card } from '../../../shared/components/Card';
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
    <Card>
      <div className="card__header card__header--row">
        <div>
          <h2 className="section-title">Ultimos registros</h2>
          <p className="section-subtitle">Historial reciente de tus avistamientos.</p>
        </div>
        <button className="btn btn--soft" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Actualizando...' : 'Refrescar'}
        </button>
      </div>

      {error ? <AlertBanner kind="error" message={error} /> : null}

      {!loading && sightings.length === 0 ? (
        <EmptyState
          title="Aun no hay avistamientos."
          subtitle="Registra tu primera salida para comenzar el historial."
        />
      ) : null}

      <div className="sighting-list">
        {sightings.map((item) => (
          <article className="sighting-item" key={item.id}>
            {item.photo_url ? (
              <a href={item.photo_url} target="_blank" rel="noreferrer" className="sighting-item__thumb">
                <img src={item.photo_url} alt={`Foto de ${item.species_guess || 'avistamiento'}`} />
              </a>
            ) : (
              <div className="sighting-item__thumb sighting-item__thumb--empty">Sin foto</div>
            )}

            <div className="sighting-item__content">
              <h3>{item.species_guess || 'Especie no definida'}</h3>
              <p className="meta-line">
                {item.zone} · {formatDateTime(item.observed_at)}
              </p>
              {item.notes ? <p className="notes-line">{item.notes}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
