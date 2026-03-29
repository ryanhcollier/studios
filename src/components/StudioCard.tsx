import React, { useState, useEffect, useRef } from 'react';

interface StudioCardProps {
  name: string;
  url: string;
  allowsIframe: boolean;
}

const slugify = (text: string) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace all non-alphanumeric characters with a hyphen
    .replace(/(^-|-$)/g, '');    // Trim hyphens from start and end
};

const StudioCard: React.FC<StudioCardProps> = ({ name, url, allowsIframe }) => {
  const [hasVisited, setHasVisited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [errorLevel, setErrorLevel] = useState(0);
  const [isIntersectingLive, setIsIntersectingLive] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  const localUrl = `screenshots/${slugify(name)}.jpg`;
  const thumUrl = `https://image.thum.io/get/width/800/crop/600/noanimate/${encodeURIComponent(url)}`;
  const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

  const currentSrc = errorLevel === 0 ? localUrl : (errorLevel === 1 ? thumUrl : fallbackUrl);

  useEffect(() => {
    // 1. Broad observer gently triggers static fallback caching 1200px ahead
    const fallbackObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setHasVisited(true);
        }
      });
    }, { rootMargin: '1200px 0px' });

    // 2. Strict observer forcefully mounts/unmounts heavy interactive WebGL nodes 1 viewport ahead
    const liveObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        setIsIntersectingLive(entry.isIntersecting);
      });
    }, { rootMargin: '100% 0px' });

    if (cardRef.current) {
      fallbackObserver.observe(cardRef.current);
      liveObserver.observe(cardRef.current);
    }

    return () => {
      fallbackObserver.disconnect();
      liveObserver.disconnect();
    };
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
            {(allowsIframe && isIntersectingLive) && (
              <iframe 
                src={url} 
                title={`Live preview of ${name}`}
                className="live-iframe"
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                tabIndex={-1}
                scrolling="no"
              />
            )}
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
