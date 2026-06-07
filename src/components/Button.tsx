import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, fonts, gradients, layout, radius, shadows, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<Size, number> = {
  sm: layout.buttonHeight.sm,
  md: layout.buttonHeight.md,
  lg: layout.buttonHeight.lg,
};
const FONT_SIZE: Record<Size, number> = { sm: 14, md: 15, lg: 16 };
const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const textColor =
    variant === 'primary'
      ? colors.background
      : variant === 'danger'
        ? colors.white
        : variant === 'ghost'
          ? colors.primary
          : colors.white;

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={ICON_SIZE[size]} color={textColor} style={styles.iconLeft} />}
          <Text style={[styles.label, { color: textColor, fontSize: FONT_SIZE[size] }]} numberOfLines={1}>
            {label}
          </Text>
          {iconRight && (
            <Ionicons name={iconRight} size={ICON_SIZE[size]} color={textColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </>
  );

  const baseContainer: StyleProp<ViewStyle> = [
    styles.base,
    { height: HEIGHT[size], opacity: isDisabled ? 0.5 : 1 },
    fullWidth && styles.fullWidth,
    style,
  ];

  if (variant === 'primary') {
    return (
      <Pressable onPress={handlePress} disabled={isDisabled} style={({ pressed }) => [baseContainer, pressed && styles.pressed]}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
        {content}
      </Pressable>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border }
      : variant === 'danger'
        ? { backgroundColor: colors.danger }
        : { backgroundColor: 'transparent' };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [baseContainer, variantStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  gradient: { borderRadius: radius.md, ...shadows.glow },
  pressed: { transform: [{ scale: 0.97 }] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, letterSpacing: 0.2 },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
});
