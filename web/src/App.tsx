import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { PredictionForm } from './modules/predictions/components/PredictionForm';
import { BirdInfoSheet } from './modules/predictions/components/BirdInfoSheet';
import { PredictionsList } from './modules/predictions/components/PredictionsList';
import { usePredictions } from './modules/predictions/hooks/usePredictions';
import { SightingComposer } from './modules/sightings/components/SightingComposer';
import { SightingsList } from './modules/sightings/components/SightingsList';
import { useSightings } from './modules/sightings/hooks/useSightings';
import { BottomNav } from './shared/components/BottomNav';
import { BottomSheet } from './shared/components/BottomSheet';
import { Fab } from './shared/components/Fab';

type TabId = 'prediccion' | 'historial';

function CompassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M14.6 9.4l-1.7 4.4-4.5 1.8 1.8-4.5 4.4-1.7z" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 4h10" />
      <path d="M7 8h10" />
      <path d="M5 12h14v8H5z" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  );
}

const navItems: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'prediccion', label: 'Predicción', icon: <CompassIcon /> },
  { id: 'historial', label: 'Historial', icon: <AlbumIcon /> },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('prediccion');
  const [composerOpen, setComposerOpen] = useState(false);
  const [birdInfoSpecies, setBirdInfoSpecies] = useState<string | null>(null);
  const sightingsApi = useSightings();
  const predictionsApi = usePredictions();

  const stats = useMemo(() => {
    const total = sightingsApi.sightings.length;
    const withPhoto = sightingsApi.sightings.filter((item) => Boolean(item.photo_url)).length;
    return { total, withPhoto };
  }, [sightingsApi.sightings]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <p className="brand__stamp">Tarifa, Cádiz</p>
            <h1 className="brand__title">Bird Tarifa</h1>
          </div>
          <div className="brand__stats" aria-label="Estadísticas">
            <span className="stat-pill">
              <strong>{stats.total}</strong> registros
            </span>
            <span className="stat-pill">
              <strong>{stats.withPhoto}</strong> fotos
            </span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-content">
          {activeTab === 'prediccion' ? (
            <div className="screen">
              <header className="screen__head">
                <h2 className="screen__title">Predicción</h2>
                <p className="screen__subtitle">
                  Reglas ligeras por zona y hora, para decidir a dónde ir.
                </p>
              </header>
              <div className="stack">
                <PredictionForm predictionsApi={predictionsApi} />
                <PredictionsList
                  predictions={predictionsApi.predictions}
                  loading={predictionsApi.loading}
                  onSelectSpecies={(species) => setBirdInfoSpecies(species)}
                />
              </div>
            </div>
          ) : (
            <div className="screen">
              <header className="screen__head">
                <h2 className="screen__title">Historial</h2>
                <p className="screen__subtitle">Tus avistamientos, como notas de campo.</p>
              </header>
              <SightingsList
                sightings={sightingsApi.sightings}
                loading={sightingsApi.loading}
                error={sightingsApi.error}
                onRefresh={sightingsApi.refresh}
              />
            </div>
          )}
        </div>
      </main>

      <BirdInfoSheet
        open={Boolean(birdInfoSpecies)}
        species={birdInfoSpecies}
        onClose={() => setBirdInfoSpecies(null)}
      />
      <BottomNav items={navItems} activeId={activeTab} onChange={setActiveTab} />
      <Fab onClick={() => setComposerOpen(true)} ariaLabel="Nuevo avistamiento" />
      <BottomSheet
        open={composerOpen}
        title="Nuevo avistamiento"
        ariaLabel="Nuevo avistamiento"
        onClose={() => setComposerOpen(false)}
      >
        <SightingComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            sightingsApi.refresh();
            setComposerOpen(false);
            setActiveTab('historial');
          }}
        />
      </BottomSheet>
    </div>
  );
}

export default App;
