// src/features/shared/components/ui/GoogleBusinessBadge.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { ExternalLink, Star } from 'lucide-react';

export const GoogleBusinessBadge = ({ 
  url, 
  rating, 
  reviewCount, 
  placeName = 'Google Business', 
  googleLink,
  variant = 'default',
  className = '' 
}) => {
  const link = googleLink || url;
  
  if (!link) return null;

  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${className}`}
    >
      {/* Logo do Google */}
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5"
        fill="currentColor"
      >
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>

      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold text-white">
          {placeName}
        </span>
        
        {rating && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-white/80">
              {rating}
              {reviewCount && ` (${reviewCount} avaliações)`}
            </span>
          </div>
        )}
      </div>

      <ExternalLink className="w-4 h-4 text-white/60 ml-auto" />
    </a>
  );
};

// PropTypes
GoogleBusinessBadge.propTypes = {
  url: PropTypes.string,
  rating: PropTypes.number,
  reviewCount: PropTypes.number,
  placeName: PropTypes.string,
  googleLink: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
};

export default GoogleBusinessBadge;