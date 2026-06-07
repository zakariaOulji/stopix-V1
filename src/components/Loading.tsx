import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

/** Full-screen centered spinner with optional message. */
export function Loading({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

/** Inline spinner. */
export function Spinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  return <ActivityIndicator size={size} color={colors.primary} />;
}

/** A single shimmering placeholder block. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.85, 0.4] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceHigh, opacity }, style]}
    />
  );
}

/** A card-shaped skeleton, useful for list loading states. */
export function SkeletonCard() {
  return (
    <View style={styles.skelCard}>
      <View style={styles.skelRow}>
        <Skeleton width={44} height={44} rounded={radius.md} />
        <View style={styles.skelTexts}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={10} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  message: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginTop: spacing.lg },
  skelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  skelRow: { flexDirection: 'row', alignItems: 'center' },
  skelTexts: { flex: 1, marginLeft: spacing.md },
});
