import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/theme';

export interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: number;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, uri, size = 44, online, style }: AvatarProps) {
  const radius = size / 2;
  const dotSize = Math.max(10, size * 0.26);

  return (
    <View style={[{ width: size, height: size }, style]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.img, { width: size, height: size, borderRadius: radius }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: online ? colors.primary : colors.muted,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { borderWidth: 1, borderColor: colors.borderActive },
  fallback: {
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  initials: { fontFamily: fonts.heading, color: colors.white },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
