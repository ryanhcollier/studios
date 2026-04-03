import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import StudioCard from './components/StudioCard';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/export?format=csv';

type SortMode = 'random' | 'alphabetical';

const App: React.FC = () => {
  const [sortMode, setSortMode] = useState<SortMode>('random');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [studiosData, setStudiosData] = useState<any[]>([]);
  const [randomizedStudios, setRandomizedStudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Live Data directly from Google Sheets
    fetch(SHEET_CSV_URL)
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map((row: any) => {
              let parsedUrl = row['Website URL'] || row['Website'] || row['URL'] || Object.values(row)[1];
              if (parsedUrl && !/^https?:\/\//i.test(parsedUrl)) {
                parsedUrl = 'https://' + parsedUrl;
              }
              return {
                name: row['Studio Name'] || row['Studio'] || row['Name'] || Object.values(row)[0],
                url: parsedUrl,
              };
            }).filter(s => s.name && s.url);
            
            setStudiosData(parsedData);
            
            // Fisher-Yates shuffle for a robust random initial load
            const shuffled = [...parsedData];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setRandomizedStudios(shuffled);
            setLoading(false);
          }
        });
      })
      .catch(err => {
        console.error("Failed to fetch Google Sheet data:", err);
        setLoading(false);
      });
  }, []);

  const displayedStudios = useMemo(() => {
    if (!studiosData.length) return [];
    
    let list = sortMode === 'alphabetical' 
      ? [...studiosData].sort((a, b) => a.name.localeCompare(b.name))
      : randomizedStudios;
      
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(studio => studio.name.toLowerCase().includes(query));
    }
    
    return list;
  }, [sortMode, randomizedStudios, searchQuery, studiosData]);

  if (loading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1 className="site-title" style={{ opacity: 0.5, animation: 'shimmer 1.5s infinite' }}>LEGWRK</h1>
        </header>
        <div className="filter-panel" style={{ opacity: 0, pointerEvents: 'none' }}>
          <input type="text" className="search-input" />
        </div>
        <main className="grid-container" style={{ minHeight: '80vh' }}></main>
      </div>
    );
  }

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

      {/* Massive Scaled Footer typography matching the header logo */}
      {!loading && (
        <div className="footer-title-wrapper">
          <h1 className="footer-title">LEGWRK</h1>
        </div>
      )}
    </div>
  );
};

export default App;
