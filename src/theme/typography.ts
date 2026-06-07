/**
 * STOPIX typography.
 * Headings: Space Grotesk 700 — Body: Inter 400/500/600.
 * Font keys MUST match the names loaded in app/_layout.tsx via @expo-google-fonts.
 */
export const fonts = {
  // Space Grotesk (headings / numeric displays)
  heading: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_500Medium',
  // Inter (body)
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Type scale (px): 32 / 24 / 20 / 16 / 14 / 13 / 11. */
export const fontSizes = {
  display: 32,
  h1: 24,
  h2: 20,
  body: 16,
  bodySm: 14,
  caption: 13,
  tiny: 11,
} as const;

export const lineHeights = {
  display: 38,
  h1: 30,
  h2: 26,
  body: 22,
  bodySm: 20,
  caption: 18,
  tiny: 14,
} as const;

/**
 * Ready-to-spread text styles. Usage: <Text style={textStyles.h1}>…</Text>
 */
export const textStyles = {
  display: { fontFamily: fonts.heading, fontSize: fontSizes.display, lineHeight: lineHeights.display },
  h1: { fontFamily: fonts.heading, fontSize: fontSizes.h1, lineHeight: lineHeights.h1 },
  h2: { fontFamily: fonts.heading, fontSize: fontSizes.h2, lineHeight: lineHeights.h2 },
  body: { fontFamily: fonts.regular, fontSize: fontSizes.body, lineHeight: lineHeights.body },
  bodyMedium: { fontFamily: fonts.medium, fontSize: fontSizes.body, lineHeight: lineHeights.body },
  bodySm: { fontFamily: fonts.regular, fontSize: fontSizes.bodySm, lineHeight: lineHeights.bodySm },
  bodySmMedium: { fontFamily: fonts.medium, fontSize: fontSizes.bodySm, lineHeight: lineHeights.bodySm },
  caption: { fontFamily: fonts.regular, fontSize: fontSizes.caption, lineHeight: lineHeights.caption },
  tiny: { fontFamily: fonts.medium, fontSize: fontSizes.tiny, lineHeight: lineHeights.tiny },
} as const;

/** The font map to pass to useFonts(). */
export const fontAssets = {
  // populated in _layout.tsx from the @expo-google-fonts packages
} as const;
