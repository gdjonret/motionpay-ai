import type { TextStyle } from 'react-native';

export const colors = {
  background: '#090F1C',
  surface: '#111B2D',
  surfaceRaised: '#19263D',
  surfaceSunken: '#0D1627',
  border: '#26344D',
  borderStrong: '#3A4D6C',
  primary: '#3267E3',
  primaryPressed: '#2857CA',
  primarySoft: 'rgba(123, 175, 255, 0.14)',
  primaryBorder: 'rgba(123, 175, 255, 0.38)',
  accent: '#8BCBFF',
  text: '#F4F7FF',
  textSecondary: '#B9C6DC',
  muted: '#94A4BF',
  success: '#3DD68C',
  successSoft: 'rgba(61, 214, 140, 0.12)',
  warning: '#F5B544',
  warningSoft: 'rgba(245, 181, 68, 0.12)',
  danger: '#F2686E',
  dangerSoft: 'rgba(242, 104, 110, 0.12)',
  onPrimary: '#FFFFFF',
} as const;

export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1, color: colors.text },
  title: { fontSize: 28, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8, color: colors.text },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '700', letterSpacing: -0.35, color: colors.text },
  subheading: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400', color: colors.textSecondary },
  small: { fontSize: 13, lineHeight: 19, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500', color: colors.muted },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  link: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.accent },
} as const satisfies Record<string, TextStyle>;
