import React, { useState, useEffect, useRef } from 'react';

interface StudioCardProps {
  name: string;
  url: string;
}

const slugify = (text: string) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace all non-alphanumeric characters with a hyphen
    .replace(/(^-|-$)/g, '');    // Trim hyphens from start and end
};

const StudioCard: React.FC<StudioCardProps> = ({ name, url }) => {
  const [hasVisited, setHasVisited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [errorLevel, setErrorLevel] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);

  const localUrl = `/screenshots/${slugify(name)}.jpg`;
  const thumUrl = `https://image.thum.io/get/width/800/crop/600/noanimate/${encodeURIComponent(url)}`;
  const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

  const currentSrc = errorLevel === 0 ? localUrl : (errorLevel === 1 ? thumUrl : fallbackUrl);

  useEffect(() => {
    // Wait 1200px buffer, load images in advance
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setHasVisited(true);
        }
      });
    }, { rootMargin: '1200px 0px' });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <a 
      ref={cardRef} 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="studio-card"
    >
      <div className="card-image-wrapper">
        {hasVisited ? (
          <>
            {!imageLoaded && errorLevel < 2 && (
              <div className="skeleton-loader">
                <div className="shimmer"></div>
              </div>
            )}
            <img
              src={currentSrc}
              alt={`Screenshot of ${name}`}
              className={`card-image ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                if (errorLevel < 2) {
                  setErrorLevel(prev => prev + 1);
                } else {
                  setImageLoaded(true); // Stop loading animation if everything fails
                }
              }}
              loading="lazy"
            />
          </>
        ) : (
          <div className="skeleton-loader">
            <div className="shimmer"></div>
          </div>
        )}
        <div className="card-overlay" />
      </div>
      <div className="card-content">
        <h2>{name}</h2>
        <span className="card-link-icon">↗</span>
      </div>
    </a>
  );
};

export default StudioCard;
