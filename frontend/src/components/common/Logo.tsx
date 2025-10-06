import React from 'react';
import { Link } from 'react-router-dom';
import { logoConfig } from '../../config/branding';
import './Logo.css';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
  linkToHome?: boolean;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Spirit Tours Logo Component
 * Displays the logo with Pegasus and globe in different variants
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  className = '',
  linkToHome = true,
  width,
  height,
  alt = 'Spirit Tours - Memory Designers',
}) => {
  const config = logoConfig[variant];
  
  // Use provided dimensions or fall back to config
  const logoWidth = width || config.width;
  const logoHeight = height || config.height;
  
  const logoElement = (
    <div className={`spirit-tours-logo spirit-tours-logo--${variant} ${className}`}>
      <picture>
        {/* SVG for modern browsers */}
        <source 
          srcSet={config.url} 
          type="image/svg+xml"
        />
        {/* Fallback PNG */}
        <img
          src={config.fallback || config.url}
          alt={alt}
          width={logoWidth}
          height={logoHeight}
          loading="lazy"
          className="logo-image"
        />
      </picture>
      
      {/* Add tagline for full variant */}
      {variant === 'full' && (
        <span className="logo-tagline">Memory Designers</span>
      )}
    </div>
  );
  
  if (linkToHome) {
    return (
      <Link to="/" className="logo-link" aria-label="Go to homepage">
        {logoElement}
      </Link>
    );
  }
  
  return logoElement;
};

/**
 * Animated Logo Component for loading screens
 */
export const AnimatedLogo: React.FC<{ size?: number }> = ({ size = 100 }) => {
  return (
    <div className="animated-logo-container">
      <div 
        className="animated-logo"
        style={{ width: size, height: size }}
      >
        <div className="pegasus-animation">
          <svg viewBox="0 0 100 100" className="pegasus-svg">
            {/* Simplified Pegasus silhouette */}
            <path
              d="M50 20 C40 25, 35 35, 35 45 C35 55, 40 60, 45 62 L45 70 L55 70 L55 62 C60 60, 65 55, 65 45 C65 35, 60 25, 50 20 Z"
              fill="currentColor"
              className="pegasus-body"
            />
            {/* Wings */}
            <path
              d="M35 40 C25 35, 15 35, 10 40 C15 45, 25 45, 35 40 Z"
              fill="currentColor"
              className="pegasus-wing-left"
            />
            <path
              d="M65 40 C75 35, 85 35, 90 40 C85 45, 75 45, 65 40 Z"
              fill="currentColor"
              className="pegasus-wing-right"
            />
          </svg>
        </div>
        
        <div className="globe-animation">
          <div className="globe-sphere">
            <div className="globe-lines"></div>
            <div className="globe-continents"></div>
          </div>
        </div>
      </div>
      
      <div className="loading-text">
        <span>Spirit Tours</span>
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

/**
 * Logo for email templates (optimized size)
 */
export const EmailLogo: React.FC = () => {
  const { newsletter } = logoConfig;
  
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: '20px 0' }}>
            <a href="https://spirit-tours.com" target="_blank" rel="noopener noreferrer">
              <img
                src={newsletter.url}
                alt="Spirit Tours - Memory Designers"
                width={newsletter.width}
                height={newsletter.height}
                style={{
                  display: 'block',
                  border: 0,
                  outline: 'none',
                  textDecoration: 'none',
                }}
              />
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default Logo;