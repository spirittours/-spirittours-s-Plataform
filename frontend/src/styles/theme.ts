import { createTheme, ThemeOptions } from '@mui/material/styles';
import { brandColors, typography, shadows, borderRadius } from '../config/branding';

// Custom theme based on Spirit Tours branding
const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primary.royalBlue,
      light: brandColors.primary.skyBlue,
      dark: brandColors.primary.darkBlue,
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.accent.purple,
      light: brandColors.accent.violet,
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    error: {
      main: brandColors.semantic.error,
      light: '#fca5a5',
      dark: '#dc2626',
    },
    warning: {
      main: brandColors.semantic.warning,
      light: '#fcd34d',
      dark: '#d97706',
    },
    success: {
      main: brandColors.semantic.success,
      light: '#86efac',
      dark: '#059669',
    },
    info: {
      main: brandColors.semantic.info,
      light: '#7dd3fc',
      dark: '#0369a1',
    },
    background: {
      default: brandColors.neutral.offWhite,
      paper: brandColors.neutral.white,
    },
    text: {
      primary: brandColors.neutral.dark,
      secondary: brandColors.neutral.darkGray,
      disabled: brandColors.neutral.gray,
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    action: {
      active: brandColors.primary.royalBlue,
      hover: 'rgba(37, 99, 235, 0.08)',
      selected: 'rgba(37, 99, 235, 0.12)',
      disabled: brandColors.neutral.gray,
      disabledBackground: brandColors.neutral.lightGray,
    },
  },
  
  typography: {
    fontFamily: typography.fontFamily.body,
    h1: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize['5xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.6,
    },
    subtitle2: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: 1.6,
    },
    button: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: 1.5,
    },
    overline: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      lineHeight: 1.5,
    },
  },
  
  shape: {
    borderRadius: parseInt(borderRadius.lg),
  },
  
  shadows: [
    'none',
    shadows.sm,
    shadows.sm,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
    shadows['2xl'],
  ] as any,
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          padding: '10px 24px',
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: shadows.lg,
          },
        },
        containedPrimary: {
          background: brandColors.gradients.button,
          '&:hover': {
            background: brandColors.gradients.button,
            filter: 'brightness(1.1)',
          },
        },
        containedSecondary: {
          background: brandColors.gradients.accent,
          '&:hover': {
            background: brandColors.gradients.accent,
            filter: 'brightness(1.1)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            background: 'rgba(37, 99, 235, 0.08)',
          },
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          boxShadow: shadows.card,
          background: brandColors.neutral.white,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: shadows.xl,
          },
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.md,
        },
        elevation1: {
          boxShadow: shadows.sm,
        },
        elevation2: {
          boxShadow: shadows.md,
        },
        elevation3: {
          boxShadow: shadows.lg,
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.full,
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.sm,
        },
        colorPrimary: {
          background: 'rgba(37, 99, 235, 0.1)',
          color: brandColors.primary.royalBlue,
          '&:hover': {
            background: 'rgba(37, 99, 235, 0.2)',
          },
        },
        colorSecondary: {
          background: 'rgba(147, 51, 234, 0.1)',
          color: brandColors.accent.purple,
          '&:hover': {
            background: 'rgba(147, 51, 234, 0.2)',
          },
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.lg,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColors.primary.skyBlue,
              borderWidth: '2px',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColors.primary.royalBlue,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: brandColors.neutral.white,
          color: brandColors.neutral.dark,
          boxShadow: shadows.sm,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
    
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: brandColors.neutral.white,
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
    
    MuiFab: {
      styleOverrides: {
        primary: {
          background: brandColors.gradients.button,
          boxShadow: shadows.lg,
          '&:hover': {
            background: brandColors.gradients.button,
            filter: 'brightness(1.1)',
            boxShadow: shadows.xl,
          },
        },
      },
    },
    
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          fontSize: typography.fontSize.sm,
        },
        standardSuccess: {
          background: 'rgba(16, 185, 129, 0.1)',
          color: brandColors.semantic.success,
        },
        standardError: {
          background: 'rgba(239, 68, 68, 0.1)',
          color: brandColors.semantic.error,
        },
        standardWarning: {
          background: 'rgba(245, 158, 11, 0.1)',
          color: brandColors.semantic.warning,
        },
        standardInfo: {
          background: 'rgba(14, 165, 233, 0.1)',
          color: brandColors.semantic.info,
        },
      },
    },
    
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: brandColors.neutral.dark,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          padding: '8px 12px',
        },
      },
    },
    
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          margin: '4px 8px',
          '&:hover': {
            background: 'rgba(37, 99, 235, 0.08)',
          },
          '&.Mui-selected': {
            background: brandColors.gradients.card,
            '&:hover': {
              background: brandColors.gradients.card,
              filter: 'brightness(1.05)',
            },
          },
        },
      },
    },
    
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.full,
          height: 8,
          background: brandColors.neutral.lightGray,
        },
        bar: {
          borderRadius: borderRadius.full,
          background: brandColors.gradients.primary,
        },
      },
    },
  },
};

// Create light theme
export const lightTheme = createTheme(baseThemeOptions);

// Create dark theme
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    ...baseThemeOptions.palette,
    mode: 'dark',
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      disabled: '#475569',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  components: {
    ...baseThemeOptions.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#1e293b',
          color: '#f1f5f9',
          boxShadow: shadows.sm,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#1e293b',
          borderRadius: borderRadius.xl,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
});

export default lightTheme;