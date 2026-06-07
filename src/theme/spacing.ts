/**
 * Spacing scale (4pt base) + radii + layout constants.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 64,
  buttonHeight: { sm: 40, md: 48, lg: 56 },
  inputHeight: 56,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export type Spacing = keyof typeof spacing;
