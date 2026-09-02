import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  /** Returns the signature as an SVG document string. */
  onSave: (svg: string) => void;
}

const STROKE = colors.white;
const STROKE_W = 3;
const CANVAS_BG = '#1C2333';

/**
 * Pure-native signature pad (react-native-svg + PanResponder) rendered as a
 * full-screen overlay — NO WebView, NO Modal. Avoids the native freezes caused
 * by react-native-signature-canvas / stacked modals.
 */
export function SignaturePad({ visible, onClose, onSave }: SignaturePadProps) {
  const insets = useSafeAreaInsets();
  const [paths, setPaths] = useState<string[]>([]); // finished strokes
  const [current, setCurrent] = useState(''); // stroke being drawn
  const currentRef = useRef('');
  const sizeRef = useRef({ w: 0, h: 0 });

  const clear = () => {
    currentRef.current = '';
    setCurrent('');
    setPaths([]);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        if (currentRef.current) {
          const done = currentRef.current;
          currentRef.current = '';
          setCurrent('');
          setPaths((p) => [...p, done]);
        }
      },
    }),
  ).current;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: width, h: height };
  };

  const validate = () => {
    const all = currentRef.current ? [...paths, currentRef.current] : paths;
    if (all.length === 0) {
      onClose();
      return;
    }
    const { w, h } = sizeRef.current;
    const strokes = all
      .map(
        (d) =>
          `<path d="${d}" stroke="#ffffff" stroke-width="${STROKE_W}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${CANVAS_BG}"/>${strokes}</svg>`;
    onSave(svg);
    clear();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={layout.hitSlop} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Signature</Text>
        <Pressable onPress={clear} hitSlop={layout.hitSlop}>
          <Text style={styles.clear}>Effacer</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>Faites signer le destinataire ci-dessous.</Text>

      <View style={styles.canvasWrap} onLayout={onCanvasLayout} {...pan.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width="100%" height="100%" fill={CANVAS_BG} />
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={STROKE}
              strokeWidth={STROKE_W}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {current ? (
            <Path
              d={current}
              stroke={STROKE}
              strokeWidth={STROKE_W}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={validate} style={styles.validate}>
          <Ionicons name="checkmark" size={20} color={colors.background} />
          <Text style={styles.validateText}>Valider la signature</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    zIndex: 50,
    elevation: 50,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  iconBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  clear: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  canvasWrap: {
    flex: 1,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    overflow: 'hidden',
    backgroundColor: CANVAS_BG,
  },
  footer: { paddingTop: spacing.lg },
  validate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  validateText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.background },
});
