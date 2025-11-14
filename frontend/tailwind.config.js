/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    // Enhanced breakpoints for mobile-first design
    screens: {
      'xs': '375px',    // Small phones
      'sm': '640px',    // Phones
      'md': '768px',    // Tablets
      'lg': '1024px',   // Small laptops
      'xl': '1280px',   // Desktops
      '2xl': '1536px',  // Large screens
      // Custom breakpoints
      'mobile': { 'max': '767px' },
      'tablet': { 'min': '768px', 'max': '1023px' },
      'desktop': { 'min': '1024px' },
      // Orientation-based
      'portrait': { 'raw': '(orientation: portrait)' },
      'landscape': { 'raw': '(orientation: landscape)' },
      // Touch devices
      'touch': { 'raw': '(hover: none)' },
      'no-touch': { 'raw': '(hover: hover)' },
    },
    extend: {
      colors: {
        'spirit-primary': '#667eea',
        'spirit-secondary': '#764ba2',
        'spirit-accent': '#f093fb',
        'spirit-success': '#10b981',
        'spirit-warning': '#f59e0b',
        'spirit-error': '#ef4444',
        'spirit-info': '#3b82f6',
      },
      backgroundImage: {
        'spirit-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'spirit-accent-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'spirit-subtle': 'linear-gradient(to bottom, #f3f4f6, #ffffff)',
      },
      // Touch-friendly spacing
      spacing: {
        'touch': '44px',  // Minimum touch target size (iOS/Android guidelines)
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Mobile-optimized typography
      fontSize: {
        'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      // Animation for mobile interactions
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'shake': 'shake 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      // Mobile-friendly shadows
      boxShadow: {
        'mobile': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'mobile-xl': '0 8px 20px rgba(0, 0, 0, 0.2)',
      },
      // Touch-optimized transitions
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },
      // Z-index scale
      zIndex: {
        'modal': '1000',
        'drawer': '900',
        'dropdown': '800',
        'sticky': '700',
        'fixed': '600',
        'overlay': '500',
      },
      // Mobile-friendly border radius
      borderRadius: {
        'mobile': '12px',
        'mobile-lg': '16px',
        'mobile-xl': '20px',
      },
    },
  },
  plugins: [
    // Custom plugin for touch utilities
    function({ addUtilities }) {
      const touchUtilities = {
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.user-select-none': {
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          '-ms-user-select': 'none',
          'user-select': 'none',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none',
          },
        },
        '.safe-area-inset': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
      };
      addUtilities(touchUtilities);
    },
  ],
}
