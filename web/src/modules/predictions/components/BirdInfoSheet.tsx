import { useEffect, useMemo, useState } from 'react';

import { getBirdInfo } from '../../../api/endpoints';
import type { BirdInfoOut } from '../../../api/types';
import { AlertBanner } from '../../../shared/components/AlertBanner';
import { BottomSheet } from '../../../shared/components/BottomSheet';

type BirdInfoSheetProps = {
  open: boolean;
  species: string | null;
  onClose: () => void;
};

export function BirdInfoSheet({ open, species, onClose }: BirdInfoSheetProps) {
  const [info, setInfo] = useState<BirdInfoOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!species) return 'Ficha';
    return species;
  }, [species]);

  useEffect(() => {
    if (!open || !species) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setInfo(null);

    getBirdInfo(species)
      .then((payload) => {
        if (cancelled) return;
        setInfo(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'No se pudo cargar la ficha del ave.';
        setError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, species]);

  return (
    <BottomSheet
      open={open}
      title={title}
      ariaLabel={species ? `Ficha de ${species}` : 'Ficha de ave'}
      onClose={onClose}
    >
      <div className="bird-sheet">
        {error ? <AlertBanner kind="error" message={error} /> : null}
        {loading ? <p className="loading-line">Cargando ficha...</p> : null}

        {info ? (
          <>
            <div className="bird-hero">
              {info.photo_url ? (
                <img
                  className="bird-hero__img"
                  src={info.photo_url}
                  alt={info.title || info.species}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="bird-hero__placeholder" role="img" aria-label="Sin foto disponible">
                  <p className="bird-hero__placeholder-title">Sin foto</p>
                  <p className="bird-hero__placeholder-subtitle">Prueba otro nombre o zona.</p>
                </div>
              )}
            </div>

            {info.extract ? (
              <p className="bird-copy">{info.extract}</p>
            ) : (
              <p className="bird-copy bird-copy--muted">
                No encontramos una descripciÃ³n rÃ¡pida para este nombre.
              </p>
            )}

            <div className="bird-actions">
              {info.page_url ? (
                <a className="btn btn--soft" href={info.page_url} target="_blank" rel="noreferrer">
                  Abrir Wikipedia
                </a>
              ) : null}
              {info.source ? <p className="bird-source">Fuente: {info.source}</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </BottomSheet>
  );
}

