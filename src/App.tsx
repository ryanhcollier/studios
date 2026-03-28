import React, { useState, useEffect, useMemo } from 'react';
import StudioCard from './components/StudioCard';
import studiosData from './data/studios.json';

type SortMode = 'random' | 'alphabetical';

const App: React.FC = () => {
  const [sortMode, setSortMode] = useState<SortMode>('random');
  const [randomizedStudios, setRandomizedStudios] = useState(studiosData);

  useEffect(() => {
    // Fisher-Yates shuffle for a robust random initial load
    const shuffled = [...studiosData];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRandomizedStudios(shuffled);
  }, []);

  const displayedStudios = useMemo(() => {
    if (sortMode === 'alphabetical') {
      return [...studiosData].sort((a, b) => a.name.localeCompare(b.name));
    }
    return randomizedStudios;
  }, [sortMode, randomizedStudios]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Legwrk.</h1>
        <p>A curated collection of creative offices in New York City.</p>

        <div className="filter-panel">
          <span className="filter-label">Sort by:</span>
          <button 
            className={`sort-btn ${sortMode === 'random' ? 'active' : ''}`}
            onClick={() => setSortMode('random')}
          >
            Random
          </button>
          <button 
            className={`sort-btn ${sortMode === 'alphabetical' ? 'active' : ''}`}
            onClick={() => setSortMode('alphabetical')}
          >
            Alphabetical
          </button>
        </div>
      </header>

      <main className="grid-container">
        {displayedStudios.map((studio) => (
          <StudioCard 
             key={studio.name} 
             name={studio.name} 
             url={studio.url} 
             allowsIframe={(studio as any).allowsIframe !== false} 
          />
        ))}
      </main>
    </div>
  );
};

export default App;
