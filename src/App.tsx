import React, { useState, useEffect, useMemo } from 'react';
import Lenis from 'lenis';
import StudioCard from './components/StudioCard';
import studiosData from './data/studios.json';

type SortMode = 'random' | 'alphabetical';

const App: React.FC = () => {
  const [sortMode, setSortMode] = useState<SortMode>('random');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [randomizedStudios, setRandomizedStudios] = useState(studiosData);

  useEffect(() => {
    // Initialize Lenis for buttery smooth inertial scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Fisher-Yates shuffle for a robust random initial load
    const shuffled = [...studiosData];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRandomizedStudios(shuffled);

    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  const displayedStudios = useMemo(() => {
    let list = sortMode === 'alphabetical' 
      ? [...studiosData].sort((a, b) => a.name.localeCompare(b.name))
      : randomizedStudios;
      
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(studio => studio.name.toLowerCase().includes(query));
    }
    
    return list;
  }, [sortMode, randomizedStudios, searchQuery]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="site-title">LEGWRK</h1>
      </header>

      <div className="filter-panel">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search studios..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

          <div className="view-toggle-divider"></div>

          <button 
            className={`sort-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button 
            className={`sort-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>

      {viewMode === 'grid' ? (
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
      ) : (
        <main className="list-container">
          {displayedStudios.map((studio) => (
            <a 
              key={studio.name}
              href={studio.url}
              target="_blank"
              rel="noopener noreferrer"
              className="list-item"
            >
              {studio.name}
              <span className="list-link-icon">↗</span>
            </a>
          ))}
        </main>
      )}
    </div>
  );
};

export default App;
