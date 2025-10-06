/**
 * Spirit Tours Branding Configuration
 * Based on the official logo design with Pegasus and Globe
 */

export const brandColors = {
  // Primary Colors from Logo
  primary: {
    darkBlue: '#1e3a8a',    // Deep blue from logo
    royalBlue: '#2563eb',   // Royal blue
    skyBlue: '#0ea5e9',     // Sky blue from globe
    lightBlue: '#38bdf8',   // Light blue accent
  },
  
  // Accent Colors from Logo Background
  accent: {
    purple: '#9333ea',      // Vibrant purple
    violet: '#8b5cf6',      // Soft violet
    pink: '#ec4899',        // Hot pink
    coral: '#f97316',       // Orange/coral
    yellow: '#fbbf24',      // Golden yellow
    orange: '#fb923c',      // Bright orange
  },
  
  // Gradient Combinations
  gradients: {
    primary: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 50%, #38bdf8 100%)',
    accent: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #fb923c 100%)',
    hero: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 25%, #9333ea 50%, #ec4899 75%, #fb923c 100%)',
    card: 'linear-gradient(145deg, rgba(37, 99, 235, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
    button: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
  },
  
  // Neutral Colors
  neutral: {
    white: '#ffffff',
    offWhite: '#f8fafc',
    lightGray: '#f1f5f9',
    gray: '#94a3b8',
    darkGray: '#475569',
    dark: '#1e293b',
    black: '#0f172a',
  },
  
  // Semantic Colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
  }
};

export const logoConfig = {
  // Logo URLs - Using CDN for performance
  full: {
    url: 'https://cdn.spirit-tours.com/logo/spirit-tours-full.svg',
    fallback: '/assets/logo/spirit-tours-full.png',
    width: 280,
    height: 100,
  },
  
  // Compact version for headers
  compact: {
    url: 'https://cdn.spirit-tours.com/logo/spirit-tours-compact.svg',
    fallback: '/assets/logo/spirit-tours-compact.png',
    width: 180,
    height: 60,
  },
  
  // Icon only (Pegasus with globe)
  icon: {
    url: 'https://cdn.spirit-tours.com/logo/spirit-tours-icon.svg',
    fallback: '/assets/logo/spirit-tours-icon.png',
    width: 48,
    height: 48,
  },
  
  // Favicon variants
  favicon: {
    ico: '/favicon.ico',
    png16: '/favicon-16x16.png',
    png32: '/favicon-32x32.png',
    png192: '/android-chrome-192x192.png',
    png512: '/android-chrome-512x512.png',
    appleTouchIcon: '/apple-touch-icon.png',
  },
  
  // Newsletter optimized version (smaller file size)
  newsletter: {
    url: 'https://cdn.spirit-tours.com/logo/spirit-tours-email.png',
    width: 200,
    height: 70,
    maxFileSize: '50kb',
  },
  
  // Social media variants
  social: {
    og: 'https://cdn.spirit-tours.com/logo/spirit-tours-og.png',
    twitter: 'https://cdn.spirit-tours.com/logo/spirit-tours-twitter.png',
    whatsapp: 'https://cdn.spirit-tours.com/logo/spirit-tours-whatsapp.png',
  }
};

export const typography = {
  fontFamily: {
    heading: '"Poppins", "Segoe UI", sans-serif',
    body: '"Inter", "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '4rem',
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  }
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  glow: '0 0 20px rgba(147, 51, 234, 0.4)',
  card: '0 4px 20px rgba(37, 99, 235, 0.15)',
};

export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideUp: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.8 },
    },
  }
};

export default {
  brandColors,
  logoConfig,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
};