export const Colors = {
  primary: '#1B6B4A',
  primaryLight: '#2A9D6F',
  primaryDark: '#0F4D34',
  accent: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  surface: '#F8FAFC',
  surfaceDark: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
};

export default {
  light: {
    text: Colors.gray800,
    background: Colors.surface,
    tint: Colors.primary,
    tabIconDefault: Colors.gray400,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: Colors.primaryLight,
    tabIconDefault: '#ccc',
    tabIconSelected: Colors.primaryLight,
  },
};
