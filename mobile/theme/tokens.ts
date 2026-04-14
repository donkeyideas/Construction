// Design tokens ported from web CSS custom properties
// Supports: classic/corporate variants × light/dark themes

export type Variant = 'classic' | 'corporate';
export type ThemeMode = 'light' | 'dark';

export interface ColorTokens {
  bg: string;
  surface: string;
  cardBg: string;
  text: string;
  muted: string;
  border: string;
  blue: string;
  blueLight: string;
  blueDark: string;
  amber: string;
  amberLight: string;
  green: string;
  greenLight: string;
  red: string;
  redLight: string;
  tabBg: string;
}

const classicLight: ColorTokens = {
  bg: '#ffffff',
  surface: '#f5f0eb',
  cardBg: '#ffffff',
  text: '#292524',
  muted: '#78716c',
  border: '#d6d3d1',
  blue: '#1d4ed8',
  blueLight: '#eff6ff',
  blueDark: '#1e40af',
  amber: '#b45309',
  amberLight: '#fef3c7',
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#dc2626',
  redLight: '#fee2e2',
  tabBg: '#ffffff',
};

const classicDark: ColorTokens = {
  bg: '#1c1917',
  surface: '#292524',
  cardBg: '#292524',
  text: '#f5f0eb',
  muted: '#a8a29e',
  border: '#44403c',
  blue: '#3b82f6',
  blueLight: 'rgba(59,130,246,0.15)',
  blueDark: '#2563eb',
  amber: '#b45309',
  amberLight: '#fef3c7',
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#dc2626',
  redLight: '#fee2e2',
  tabBg: '#1c1917',
};

const corporateLight: ColorTokens = {
  bg: '#ffffff',
  surface: '#f0f2f5',
  cardBg: '#f8f9fb',
  text: '#1a202c',
  muted: '#718096',
  border: '#d1d9e6',
  blue: '#2c5282',
  blueLight: 'rgba(44,82,130,0.1)',
  blueDark: '#1e3a5f',
  amber: '#c9a84c',
  amberLight: 'rgba(201,168,76,0.12)',
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#dc2626',
  redLight: '#fee2e2',
  tabBg: '#ffffff',
};

const corporateDark: ColorTokens = {
  bg: '#1a2332',
  surface: '#243447',
  cardBg: '#243447',
  text: '#e2e8f0',
  muted: '#a0aec0',
  border: '#3a4f65',
  blue: '#3b6ba5',
  blueLight: 'rgba(59,107,165,0.2)',
  blueDark: '#2c5282',
  amber: '#d4b96a',
  amberLight: 'rgba(212,185,106,0.15)',
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#dc2626',
  redLight: '#fee2e2',
  tabBg: '#1a2332',
};

const colorMap: Record<Variant, Record<ThemeMode, ColorTokens>> = {
  classic: { light: classicLight, dark: classicDark },
  corporate: { light: corporateLight, dark: corporateDark },
};

export function getColors(variant: Variant, mode: ThemeMode): ColorTokens {
  return colorMap[variant][mode];
}

export interface FontTokens {
  serif: string;
  sans: string;
  heading: string;
}

export const fonts: Record<Variant, FontTokens> = {
  classic: { serif: 'PlayfairDisplay', sans: 'Inter', heading: 'PlayfairDisplay' },
  corporate: { serif: 'Inter', sans: 'Inter', heading: 'Inter' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export interface RadiiTokens {
  sm: number;
  md: number;
  lg: number;
  full: number;
}

export const radii: Record<Variant, RadiiTokens> = {
  classic: { sm: 6, md: 10, lg: 14, full: 9999 },
  corporate: { sm: 4, md: 8, lg: 12, full: 9999 },
};

export const splashGradient = {
  classic: ['#1d4ed8', '#1e40af', '#172554'] as const,
  corporate: ['#2c5282', '#1e3a5f', '#1a2332'] as const,
};
