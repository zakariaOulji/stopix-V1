/**
 * STOPIX — "Field OS" color system.
 * Dark mode ONLY. Tuned for outdoor / in-motion readability.
 */
export const colors = {
  background: '#0A0F1E', // main app background
  surface: '#1C2333', // cards, panels
  surfaceHigh: '#242D42', // raised cards

  primary: '#00D46A', // CTA, success, active
  primaryDark: '#00A854',

  white: '#FFFFFF', // primary text
  muted: '#8A93A8', // secondary text

  danger: '#FF4D4D',
  warning: '#FFB020',
  info: '#3B9EFF',

  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(255,255,255,0.20)',

  // Translucent helpers used across components
  overlay: 'rgba(10,15,30,0.72)', // backdrops
  primarySoft: 'rgba(0,212,106,0.14)', // tinted primary surfaces
  dangerSoft: 'rgba(255,77,77,0.14)',
  warningSoft: 'rgba(255,176,32,0.14)',
  infoSoft: 'rgba(59,158,255,0.14)',
  whiteSoft: 'rgba(255,255,255,0.06)',
} as const;

export type ColorKey = keyof typeof colors;

/** Gradient presets (use with expo-linear-gradient). */
export const gradients = {
  primary: ['#00D46A', '#00A854'] as const,
  surface: ['#242D42', '#1C2333'] as const,
  dark: ['#141B2E', '#0A0F1E'] as const,
  glow: ['rgba(0,212,106,0.25)', 'rgba(0,212,106,0)'] as const,
};
