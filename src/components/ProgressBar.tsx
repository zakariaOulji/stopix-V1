import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '@/theme';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, height = 8, trackColor = colors.surfaceHigh, style }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clamped * 100}%`, borderRadius: height / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
