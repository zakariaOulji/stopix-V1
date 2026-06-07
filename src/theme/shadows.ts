import { Platform } from 'react-native';

/**
 * Elevation presets for dark UI. On a dark theme shadows read as subtle depth +
 * a faint border highlight rather than the soft grey of light mode.
 */
type Elevation = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const make = (height: number, radius: number, opacity: number, androidElevation: number): Elevation => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: androidElevation,
});

export const shadows = {
  none: make(0, 0, 0, 0),
  low: make(2, 8, 0.25, 2),
  mid: make(6, 16, 0.35, 6),
  high: make(12, 28, 0.45, 12),
  // A green glow used for primary CTAs.
  glow: Platform.select({
    ios: {
      shadowColor: '#00D46A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    android: { elevation: 8 },
    default: {},
  }) as Elevation,
} as const;

export type ShadowKey = keyof typeof shadows;
