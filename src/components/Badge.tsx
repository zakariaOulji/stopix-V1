import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<BadgeVariant, { fg: string; bg: string }> = {
  success: { fg: colors.primary, bg: colors.primarySoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.muted, bg: colors.whiteSoft },
};

export function Badge({ label, variant = 'neutral', icon, dot, style }: BadgeProps) {
  const { fg, bg } = PALETTE[variant];
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: fg }]} />}
      {icon && <Ionicons name={icon} size={12} color={fg} style={styles.icon} />}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.sm },
  icon: { marginRight: spacing.xs },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.2 },
});
