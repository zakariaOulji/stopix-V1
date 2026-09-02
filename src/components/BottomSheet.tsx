import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Disable drag-to-close (e.g. for required choices). */
  dismissable?: boolean;
}

const SPRING = { damping: 20, stiffness: 220, mass: 0.7 };
const CLOSE_THRESHOLD = 90;

export function BottomSheet({ visible, onClose, children, title, dismissable = true }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(360);

  const translateY = useSharedValue(sheetHeight);

  const open = useCallback(() => {
    translateY.value = withSpring(0, SPRING);
  }, [translateY]);

  const close = useCallback(() => {
    translateY.value = withTiming(sheetHeight, { duration: 200 });
  }, [sheetHeight, translateY]);

  // Drive mount + animation off the `visible` prop.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      // open on next frame once mounted
      requestAnimationFrame(open);
    } else if (mounted) {
      close();
      // Guarantee the unmount even if the close animation is interrupted by a
      // relayout (e.g. sheet content shrinking on dismiss). Otherwise the sheet
      // stays mounted and its invisible backdrop keeps capturing touches → the
      // whole app appears frozen.
      const t = setTimeout(() => setMounted(false), 240);
      return () => clearTimeout(t);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    // Only adopt the measured height while open — never snap translateY here, as
    // that would cancel an in-flight close animation.
    if (h > 0 && visible && Math.abs(h - sheetHeight) > 1) setSheetHeight(h);
  };

  const pan = Gesture.Pan()
    .enabled(dismissable)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          onLayout={onLayout}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
              {title && <Text style={styles.title}>{title}</Text>}
            </View>
          </GestureDetector>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  handleArea: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderActive },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.white,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  content: { paddingTop: spacing.sm },
});
