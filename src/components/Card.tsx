import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';

type Elevation = 'low' | 'mid' | 'high';

export interface CardProps {
  children: React.ReactNode;
  elevation?: Elevation;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Elevation, string> = {
  low: colors.surface,
  mid: colors.surface,
  high: colors.surfaceHigh,
};

export function Card({ children, elevation = 'low', onPress, padded = true, style }: CardProps) {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    { backgroundColor: BG[elevation] },
    shadows[elevation],
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
