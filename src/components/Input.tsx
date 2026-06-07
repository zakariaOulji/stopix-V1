import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  value,
  onFocus,
  onBlur,
  containerStyle,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const hasValue = !!value && value.length > 0;
  const floated = focused || hasValue;
  const anim = useRef(new Animated.Value(hasValue ? 1 : 0)).current;

  const animateTo = (to: number) =>
    Animated.timing(anim, { toValue: to, duration: 150, useNativeDriver: false }).start();

  const borderColor = error ? colors.danger : focused ? colors.borderActive : colors.border;

  return (
    <View style={containerStyle}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.field,
          { borderColor },
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? colors.primary : colors.muted}
            style={styles.iconLeft}
          />
        )}

        <View style={styles.inputWrap}>
          <Animated.Text
            style={[
              styles.label,
              {
                color: error ? colors.danger : focused ? colors.primary : colors.muted,
                top: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 7] }),
                fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            value={value}
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            style={[styles.input, floated && styles.inputFloated]}
            onFocus={(e) => {
              setFocused(true);
              animateTo(1);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              if (!hasValue) animateTo(0);
              onBlur?.(e);
            }}
            {...rest}
          />
        </View>

        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={layout.hitSlop} style={styles.iconRight}>
            <Ionicons name={rightIcon} size={20} color={colors.muted} />
          </Pressable>
        )}
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Animated.Text style={styles.errorText}>{error}</Animated.Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  fieldFocused: { backgroundColor: colors.surfaceHigh },
  fieldError: {},
  iconLeft: { marginRight: spacing.md },
  iconRight: { marginLeft: spacing.md, padding: 2 },
  inputWrap: { flex: 1, justifyContent: 'center', height: layout.inputHeight },
  label: {
    position: 'absolute',
    left: 0,
    fontFamily: fonts.medium,
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.white,
    paddingVertical: 0,
    paddingTop: 0,
  },
  inputFloated: { marginTop: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginLeft: 4 },
});
