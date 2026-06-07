import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, NavigationSheet, StopsMap, SwipeConfirm } from '@/components';
import { useTourneeStore } from '@/stores';
import { failureReasonMeta } from '@/utils/status';
import type { FailureReason } from '@/types';
import { colors, fonts, layout, radius, shadows, spacing } from '@/theme';

const REASONS: FailureReason[] = ['absent', 'refus', 'adresse_invalide', 'autre'];
const PEEK = 268; // visible panel height when collapsed
const SPRING = { damping: 22, stiffness: 240, mass: 0.7 };

export default function ExecuteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const allStops = useTourneeStore((s) => s.stops);
  const markDelivered = useTourneeStore((s) => s.markDelivered);
  const markFailed = useTourneeStore((s) => s.markFailed);
  const skipStop = useTourneeStore((s) => s.skipStop);

  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const ordered = useMemo(
    () => allStops.filter((s) => s.tourneeId === id).sort((a, b) => a.order - b.order),
    [allStops, id],
  );
  const total = ordered.length;
  const current = ordered.find((s) => s.status === 'pending');
  const doneCount = ordered.filter((s) => s.status !== 'pending').length;
  const remaining = total - doneCount;

  // --- Draggable panel ---
  const ty = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const maxTy = useSharedValue(0);

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    maxTy.value = Math.max(0, h - PEEK);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = savedTy.value + e.translationY;
      ty.value = Math.min(Math.max(0, next), maxTy.value);
    })
    .onEnd((e) => {
      const target = ty.value > maxTy.value / 2 || e.velocityY > 600 ? maxTy.value : 0;
      ty.value = withSpring(target, SPRING);
      savedTy.value = target;
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  const onDelivered = () => {
    if (current) markDelivered(current.id);
  };

  const onPickReason = (reason: FailureReason) => {
    if (current) {
      markFailed(current.id, reason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setReasonsOpen(false);
  };

  const onSkip = () => {
    if (!current) return;
    Haptics.selectionAsync();
    skipStop(current.id);
  };

  const onNavigate = () => {
    if (current) setNavOpen(true);
  };

  return (
    <View style={styles.root}>
      {/* Full-screen map */}
      <StopsMap stops={ordered} highlightStopId={current?.id} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={layout.hitSlop}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.counter}>
          <Text style={styles.counterText}>{doneCount}/{total} traités</Text>
        </View>
        <View style={styles.remainingChip}>
          <Ionicons name="cube" size={13} color={colors.primary} />
          <Text style={styles.remainingText}>{remaining}</Text>
        </View>
      </View>

      {/* Bottom panel */}
      {current ? (
        <Animated.View
          onLayout={onPanelLayout}
          style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }, panelStyle]}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          {/* Header (visible when collapsed) */}
          <View style={styles.stopHeader}>
            <View style={[styles.orderDisc, { borderColor: colors.primary }]}>
              <Text style={styles.orderText}>{current.order}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.recipient} numberOfLines={1}>{current.recipient}</Text>
              <Text style={styles.address} numberOfLines={2}>
                {current.address}, {current.postalCode} {current.city}
              </Text>
            </View>
            {current.eta && (
              <View style={styles.eta}>
                <Ionicons name="time-outline" size={13} color={colors.muted} />
                <Text style={styles.etaText}>{current.eta}</Text>
              </View>
            )}
          </View>

          {/* Swipe to confirm (visible when collapsed) */}
          <SwipeConfirm key={current.id} onConfirm={onDelivered} label="Glisser pour livrer" confirmedLabel="Livré ✓" />

          {/* Secondary actions (visible when collapsed) */}
          <View style={styles.actions}>
            <SecondaryBtn icon="close-circle-outline" label="Échec" color={colors.danger} onPress={() => setReasonsOpen(true)} />
            <SecondaryBtn icon="arrow-undo-outline" label="Reporter" color={colors.warning} onPress={onSkip} />
            <SecondaryBtn icon="navigate-outline" label="Naviguer" color={colors.info} onPress={onNavigate} />
          </View>

          {/* Details (revealed when expanded) */}
          <View style={styles.details}>
            <DetailRow icon="cube-outline" label="Colis" value={`${current.packages}`} />
            {current.accessCode && <DetailRow icon="keypad-outline" label="Code d'accès" value={current.accessCode} />}
            {current.notes && (
              <View style={styles.notes}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.notesText}>{current.notes}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      ) : (
        <CompletionCard
          delivered={ordered.filter((s) => s.status === 'delivered').length}
          failed={ordered.filter((s) => s.status === 'failed').length}
          total={total}
          insetBottom={insets.bottom}
          onClose={() => router.replace('/(tabs)/dashboard')}
        />
      )}

      {/* Failure reasons sheet */}
      <BottomSheet visible={reasonsOpen} onClose={() => setReasonsOpen(false)} title="Raison de l'échec">
        <View style={styles.reasonList}>
          {REASONS.map((r) => (
            <Pressable key={r} onPress={() => onPickReason(r)} style={({ pressed }) => [styles.reasonRow, pressed && styles.reasonPressed]}>
              <View style={styles.reasonIcon}>
                <Ionicons name={failureReasonMeta[r].icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.danger} />
              </View>
              <Text style={styles.reasonLabel}>{failureReasonMeta[r].label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* Navigation app chooser */}
      <NavigationSheet
        visible={navOpen}
        onClose={() => setNavOpen(false)}
        target={current ? { lat: current.lat, lng: current.lng, label: current.address } : null}
      />
    </View>
  );
}

function SecondaryBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secBtn, pressed && styles.secPressed]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.secLabel}>{label}</Text>
    </Pressable>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CompletionCard({
  delivered,
  failed,
  total,
  insetBottom,
  onClose,
}: {
  delivered: number;
  failed: number;
  total: number;
  insetBottom: number;
  onClose: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      style={[styles.panel, styles.completion, { paddingBottom: insetBottom + spacing.lg }]}
    >
      <View style={styles.completionIcon}>
        <Ionicons name="checkmark-done" size={40} color={colors.primary} />
      </View>
      <Text style={styles.completionTitle}>Tournée terminée 🎉</Text>
      <Text style={styles.completionSub}>
        {delivered}/{total} livrés{failed > 0 ? ` · ${failed} échec(s)` : ''}
      </Text>
      <Button label="Retour au tableau de bord" size="lg" icon="home" onPress={onClose} style={styles.completionBtn} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.low,
  },
  counter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadows.low,
  },
  counterText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  remainingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: 14,
    ...shadows.low,
  },
  remainingText: { fontFamily: fonts.heading, fontSize: 15, color: colors.white },

  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    ...shadows.high,
  },
  handleArea: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs, marginHorizontal: -spacing.xl },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderActive },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orderDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  flex1: { flex: 1 },
  recipient: { fontFamily: fonts.semibold, fontSize: 17, color: colors.white },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  eta: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  etaText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },

  actions: { flexDirection: 'row', gap: spacing.md },
  secBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secPressed: { opacity: 0.7 },
  secLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.white },

  details: { gap: spacing.md, paddingTop: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, flex: 1 },
  detailValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  notes: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  notesText: { fontFamily: fonts.medium, fontSize: 13, color: colors.white, flex: 1, lineHeight: 19 },

  completion: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  completionIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  completionTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.white },
  completionSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  completionBtn: { marginTop: spacing.lg, alignSelf: 'stretch' },

  reasonList: { gap: spacing.sm, paddingBottom: spacing.sm },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  reasonPressed: { opacity: 0.7 },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.white },
});
