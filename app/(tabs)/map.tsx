import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, NavigationSheet, StopsMap } from '@/components';
import { useTourneeStore } from '@/stores';
import { stopStatusMeta } from '@/utils/status';
import type { Stop, StopStatus } from '@/types';
import { colors, fonts, layout, radius, shadows, spacing } from '@/theme';

const LEGEND: StopStatus[] = ['delivered', 'pending', 'failed', 'skipped'];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const allStops = useTourneeStore((s) => s.stops);
  const tournees = useTourneeStore((s) => s.tournees);

  const [selected, setSelected] = useState<Stop | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const todayStops = useMemo(() => {
    const active = tournees.find((t) => t.status === 'active');
    return active ? allStops.filter((s) => s.tourneeId === active.id) : allStops;
  }, [allStops, tournees]);

  return (
    <View style={styles.root}>
      <StopsMap
        stops={todayStops}
        interactive
        highlightStopId={selected?.id}
        onMarkerPress={setSelected}
        style={StyleSheet.absoluteFill}
      />

      {/* Top overlay */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>Carte du jour</Text>
          <View style={styles.countChip}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={styles.countText}>{todayStops.length} stops</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {LEGEND.map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: stopStatusMeta[s].color }]} />
              <Text style={styles.legendText}>{stopStatusMeta[s].label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Selected stop mini card */}
      {selected && (
        <View style={[styles.card, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.disc, { borderColor: stopStatusMeta[selected.status].color }]}>
              <Text style={[styles.discText, { color: stopStatusMeta[selected.status].color }]}>
                {selected.order}
              </Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.recipient} numberOfLines={1}>{selected.recipient}</Text>
              <Text style={styles.address} numberOfLines={1}>
                {selected.address}, {selected.postalCode}
              </Text>
            </View>
            <Pressable onPress={() => setSelected(null)} hitSlop={layout.hitSlop}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.cardMeta}>
            <Badge label={stopStatusMeta[selected.status].label} variant={stopStatusMeta[selected.status].badge} dot />
            <View style={styles.metaItem}>
              <Ionicons name="cube-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText}>{selected.packages} colis</Text>
            </View>
            {selected.eta && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText}>{selected.eta}</Text>
              </View>
            )}
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
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: layout.screenPadding, gap: spacing.md },
  titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.white },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadows.low,
  },
  countText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  legend: {
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
