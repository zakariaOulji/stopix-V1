import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme';

export interface SwipeConfirmProps {
  label?: string;
  confirmedLabel?: string;
  onConfirm: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const TRACK_HEIGHT = 60;
const THUMB = 52;
const PADDING = (TRACK_HEIGHT - THUMB) / 2;

export function SwipeConfirm({
  label = 'Glisser pour confirmer',
  confirmedLabel = 'Livré ✓',
  onConfirm,
  color = colors.primary,
  icon = 'checkmark',
}: SwipeConfirmProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [done, setDone] = useState(false);
  const x = useSharedValue(0);

  const maxX = Math.max(0, trackWidth - THUMB - PADDING * 2);

  const haptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  const finish = () => {
    setDone(true);
    onConfirm();
  };

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const pan = Gesture.Pan()
    .enabled(!done && maxX > 0)
    .onUpdate((e) => {
      x.value = Math.min(Math.max(0, e.translationX), maxX);
    })
    .onEnd(() => {
      if (x.value > maxX * 0.85) {
        x.value = withTiming(maxX, { duration: 120 });
        runOnJS(haptic)();
        runOnJS(finish)();
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PADDING }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, maxX * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.track, { borderColor: `${color}55` }]} onLayout={onLayout}>
      <Animated.View style={[styles.fill, { backgroundColor: `${color}22` }, fillStyle]} />

      {done ? (
        <Text style={[styles.label, styles.doneLabel, { color }]}>{confirmedLabel}</Text>
      ) : (
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, { backgroundColor: color }, thumbStyle]}>
          <Ionicons name={done ? 'checkmark-done' : icon} size={24} color={colors.background} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  label: {
    alignSelf: 'center',
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.3,
  },
  doneLabel: { fontFamily: fonts.heading },
  thumb: {
    position: 'absolute',
    left: PADDING,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
