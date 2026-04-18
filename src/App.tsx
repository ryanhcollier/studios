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
  const [heroStudio, setHeroStudio] = useState<any>(null);
  const [customHero, setCustomHero] = useState<{name: string, url: string, isVideo: boolean} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to discover a custom hero from the generated index.json
    fetch('https://legwrk.com/hero/index.json')
      .then(res => res.ok ? res.json() : Promise.reject('No hero index found'))
      .then((files: string[]) => {
        if (files && files.length > 0) {
           let filename = files[0];
           const decodedFn = decodeURIComponent(filename);
           const nameWithoutExt = decodedFn.replace(/\.(jpg|jpeg|mp4)$/i, '');
           setCustomHero({
             name: nameWithoutExt,
             url: `https://legwrk.com/hero/${filename}`,
             isVideo: /\.mp4$/i.test(filename)
           });
        }
      })
      .catch((err) => {
         console.warn("Could not find custom hero folder or file, falling back to iframe:", err);
      });

    // Fetch Live Data directly from Google Sheets alongside iframe compatibility list
    Promise.all([
      fetch(SHEET_CSV_URL).then(res => res.text()),
      fetch('/iframe_status.json').then(res => res.json()).catch(() => ({}))
    ])
    .then(([csvText, iframeStatus]) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any) => {
            let parsedName = row[0];
            let parsedUrl = row[1];
            
            if (parsedName === 'Studio Name' || parsedName === 'Studio' || parsedName === 'Name') return null;
            
            if (parsedUrl && !/^https?:\/\//i.test(parsedUrl)) {
              parsedUrl = 'https://' + parsedUrl;
            }
            return {
              name: parsedName,
              url: parsedUrl,
            };
          }).filter(s => s && s.name && s.url);
          
          setStudiosData(parsedData as any[]);
          
          // Fisher-Yates shuffle for a robust random initial load
          const shuffled = [...parsedData] as any[];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setRandomizedStudios(shuffled);

          // Select a valid hero studio that allows iframing
          const validHeroStudios = shuffled.filter(s => iframeStatus[s.url] === true);
          if (validHeroStudios.length > 0) {
            setHeroStudio(validHeroStudios[Math.floor(Math.random() * validHeroStudios.length)]);
          }

          setLoading(false);
        }
      });
    })
    .catch(err => {
      console.error("Failed to fetch Google Sheet or metadata:", err);
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
          <h1 className="site-title" style={{ opacity: 0.5 }}>LEGWRK NYC</h1>
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
        <a href="https://legwrk.com" style={{ textDecoration: 'none' }}>
          <h1 className="site-title">LEGWRK NYC</h1>
        </a>
        <nav className="header-nav">
          <a href="https://legwrk.com/submit" className="nav-link">Submit</a>
          <a href="https://legwrk.com/about" className="nav-link">About</a>
        </nav>
      </header>

      {/* Hero Section */}
      {!loading && customHero ? (
        <div className="studio-card hero-card" style={{ cursor: 'default' }}>
          <div className="card-image-wrapper hero-image-wrapper">
            {customHero.isVideo ? (
               <video 
                 src={customHero.url} 
                 className="hero-iframe" 
                 style={{ objectFit: 'cover' }}
                 autoPlay 
                 loop 
                 muted 
                 playsInline 
               />
            ) : (
               <img 
                 src={customHero.url} 
                 alt={customHero.name} 
                 className="hero-iframe" 
                 style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
               />
            )}
            <div className="card-overlay" />
          </div>
          <div className="card-content" style={{ pointerEvents: 'none' }}>
            <h2>Featured Content From {customHero.name}</h2>
          </div>
        </div>
      ) : (!loading && heroStudio && (
        <a 
          href={heroStudio.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="studio-card hero-card"
        >
          <div className="card-image-wrapper hero-image-wrapper">
            <iframe 
               src={heroStudio.url} 
               className="hero-iframe" 
               title={`Live site for ${heroStudio.name}`} 
               loading="lazy"
               sandbox="allow-scripts allow-same-origin"
            />
            <div className="card-overlay" />
          </div>
          <div className="card-content">
            <h2>{heroStudio.name}</h2>
            <span className="card-link-icon">↗</span>
          </div>
        </a>
      ))}

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
