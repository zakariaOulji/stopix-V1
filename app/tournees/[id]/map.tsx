import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, NavigationSheet, StopsMap } from '@/components';
import { useTourneeStore } from '@/stores';
import { useRoutePolyline } from '@/hooks/useRoutePolyline';
import { stopStatusMeta } from '@/utils/status';
import type { Stop, StopStatus } from '@/types';
import { colors, fonts, layout, radius, shadows, spacing } from '@/theme';

const LEGEND: StopStatus[] = ['delivered', 'pending', 'failed', 'skipped'];

export default function TourneeMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tournee = useTourneeStore((s) => s.tournees.find((t) => t.id === id));
  const allStops = useTourneeStore((s) => s.stops);
  const stops = useMemo(
    () => allStops.filter((s) => s.tourneeId === id).sort((a, b) => a.order - b.order),
    [allStops, id],
  );
  const { polyline } = useRoutePolyline(stops);

  const [selected, setSelected] = useState<Stop | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <View style={styles.root}>
      <StopsMap
        stops={stops}
        interactive
        showRoute
        routePolyline={polyline ?? undefined}
        highlightStopId={selected?.id}
        onMarkerPress={setSelected}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={layout.hitSlop}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.titleChip}>
          <Text style={styles.title} numberOfLines={1}>{tournee?.name ?? 'Tournée'}</Text>
          <Text style={styles.count}>{stops.length} stops</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <View style={[styles.legend, { top: insets.top + 64 }]} pointerEvents="none">
        {LEGEND.map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: stopStatusMeta[s].color }]} />
            <Text style={styles.legendText}>{stopStatusMeta[s].label}</Text>
          </View>
        ))}
      </View>

      {/* Selected stop card */}
      {selected && (
        <View style={[styles.card, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.disc, { borderColor: stopStatusMeta[selected.status].color }]}>
              <Text style={[styles.discText, { color: stopStatusMeta[selected.status].color }]}>{selected.order}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.recipient} numberOfLines={1}>{selected.recipient}</Text>
              <Text style={styles.address} numberOfLines={1}>{selected.address}, {selected.postalCode}</Text>
            </View>
            <Pressable onPress={() => setSelected(null)} hitSlop={layout.hitSlop}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.cardMeta}>
            <Badge label={stopStatusMeta[selected.status].label} variant={stopStatusMeta[selected.status].badge} dot />
            <View style={styles.metaItem}>
              <Ionicons name="cube-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText}>
                {selected.packages} colis{selected.vrac ? ` · ${selected.vrac} vrac` : ''}
              </Text>
            </View>
          </View>
          <Button label="Naviguer" icon="navigate" size="md" onPress={() => setNavOpen(true)} />
        </View>
      )}

      <NavigationSheet
        visible={navOpen}
        onClose={() => setNavOpen(false)}
        target={selected ? { lat: selected.lat, lng: selected.lng, label: selected.address } : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
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
  titleChip: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    ...shadows.low,
  },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white, maxWidth: '90%' },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  legend: {
    position: 'absolute',
    left: layout.screenPadding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.low,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.high,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disc: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  discText: { fontFamily: fonts.heading, fontSize: 14 },
  flex1: { flex: 1 },
  recipient: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
