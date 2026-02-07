import { useMemo, useState } from 'react';

import { PredictionForm } from './modules/predictions/components/PredictionForm';
import { PredictionsList } from './modules/predictions/components/PredictionsList';
import { usePredictions } from './modules/predictions/hooks/usePredictions';
import { SightingForm } from './modules/sightings/components/SightingForm';
import { SightingsList } from './modules/sightings/components/SightingsList';
import { useSightings } from './modules/sightings/hooks/useSightings';
import { Tabs } from './shared/components/Tabs';

type TabId = 'registro' | 'prediccion';

const tabItems: { id: TabId; label: string }[] = [
  { id: 'registro', label: 'Registro' },
  { id: 'prediccion', label: 'Prediccion' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('registro');
  const sightingsApi = useSightings();
  const predictionsApi = usePredictions();

  const stats = useMemo(() => {
    const total = sightingsApi.sightings.length;
    const withPhoto = sightingsApi.sightings.filter((item) => Boolean(item.photo_url)).length;
    return { total, withPhoto };
  }, [sightingsApi.sightings]);

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__overlay" />
        <div className="container hero__content">
          <p className="hero__kicker">Bird Tarifa</p>
          <h1>Avistamiento costero con enfoque de campo y criterio limpio</h1>
          <p>
            Diseñado para registrar salidas en Tarifa y consultar aves probables en un flujo
            moderno, claro y orientado a uso real.
          </p>
          <div className="hero__stats">
            <span>
              <strong>{stats.total}</strong> registros
            </span>
            <span>
              <strong>{stats.withPhoto}</strong> con foto
            </span>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

        {activeTab === 'registro' ? (
          <div className="grid-layout">
            <SightingForm onCreated={() => sightingsApi.refresh()} />
            <SightingsList
              sightings={sightingsApi.sightings}
              loading={sightingsApi.loading}
              error={sightingsApi.error}
              onRefresh={sightingsApi.refresh}
            />
          </div>
        ) : (
          <div className="grid-layout">
            <PredictionForm predictionsApi={predictionsApi} />
            <PredictionsList predictions={predictionsApi.predictions} loading={predictionsApi.loading} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
