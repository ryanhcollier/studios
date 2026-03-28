import React, { useState, useEffect, useRef } from 'react';

interface StudioCardProps {
  name: string;
  url: string;
  allowsIframe: boolean;
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w-]+/g, '')    // Remove all non-word chars
    .replace(/--+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
};

const StudioCard: React.FC<StudioCardProps> = ({ name, url, allowsIframe }) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [errorLevel, setErrorLevel] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);

  const localUrl = `/screenshots/${slugify(name)}.jpg`;
  const thumUrl = `https://image.thum.io/get/width/800/crop/600/noanimate/${encodeURIComponent(url)}`;
  const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

  const currentSrc = errorLevel === 0 ? localUrl : (errorLevel === 1 ? thumUrl : fallbackUrl);

  useEffect(() => {
    // 1200px buffer: preload just before they scroll in, destroy when perfectly out of view to save extreme amounts of RAM/CPU
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsIntersecting(true);
        setHasVisited(true);
      } else {
        setIsIntersecting(false);
      }
    }, { rootMargin: '1200px 0px 1200px 0px' }); 

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <a ref={cardRef} href={url} target="_blank" rel="noopener noreferrer" className="studio-card">
      <div className="card-image-wrapper">
        {(allowsIframe && isIntersecting) ? (
          <iframe 
            src={url} 
            title={`Live preview of ${name}`}
            className="live-iframe"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            tabIndex={-1}
            scrolling="no"
          />
        ) : hasVisited ? (
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
