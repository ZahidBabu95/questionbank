// QuestionShaper Mobile Application Design Tokens System

export const theme = {
  colors: {
    // Brand Colors
    primary: '#2563EB',      // Indigo-600 (Main Accent)
    primaryLight: '#EFF6FF', // Indigo-50
    secondary: '#4F46E5',    // Violet-600
    secondaryLight: '#EEF2F6',

    // Functional Colors
    success: '#10B981',      // Emerald-500
    successLight: '#ECFDF5',
    warning: '#F59E0B',      // Amber-500
    warningLight: '#FEF3C7',
    danger: '#EF4444',       // Rose-500
    dangerLight: '#FEF2F2',
    info: '#06B6D4',         // Cyan-500
    infoLight: '#ECFEFF',

    // Gradients (Primary & Secondary blend)
    gradientStart: '#2563EB',
    gradientEnd: '#4F46E5',

    // Neutral Colors (Light Theme)
    bg: '#F8F9FC',           // Background color
    card: '#FFFFFF',         // Card background
    border: '#E2E8F0',       // Slate-200
    text: '#0F172A',         // Slate-900 (Primary text)
    textSecondary: '#475569',// Slate-600 (Secondary text)
    textMuted: '#94A3B8',    // Slate-400 (Placeholder/Muted text)

    // Neutral Colors (Dark Theme)
    darkBg: '#0A0A0F',
    darkCard: '#16161F',
    darkBorder: '#252535',
    darkText: '#F1F5F9',
    darkTextSecondary: '#94A3B8',
    darkTextMuted: '#64748B',
  },

  typography: {
    fontSans: 'System',
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      xxl: 22,
      xxxl: 28,
    },
    weights: {
      light: '300' as const,
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      black: '900' as const,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#475569',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 2,
    },
    lg: {
      shadowColor: '#334155',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.05,
      shadowRadius: 28,
      elevation: 4,
    },
  },
};
