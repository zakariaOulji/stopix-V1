import { colors, gradients } from './colors';
import { fonts, fontSizes, lineHeights, textStyles } from './typography';
import { spacing, radius, layout } from './spacing';
import { shadows } from './shadows';

export { colors, gradients } from './colors';
export type { ColorKey } from './colors';
export { fonts, fontSizes, lineHeights, textStyles } from './typography';
export { spacing, radius, layout } from './spacing';
export type { Spacing } from './spacing';
export { shadows } from './shadows';
export type { ShadowKey } from './shadows';

/** Single theme object for convenient destructuring. */
export const theme = {
  colors,
  gradients,
  fonts,
  fontSizes,
  lineHeights,
  textStyles,
  spacing,
  radius,
  layout,
  shadows,
} as const;

export type Theme = typeof theme;
