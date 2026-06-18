import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, ProgressBar, Screen, StopCard, StopsMap } from '@/components';
import { useTourneeStore } from '@/stores';
import { useRoutePolyline } from '@/hooks/useRoutePolyline';
import { tourneeStatusMeta } from '@/utils/status';
import { formatDuration } from '@/utils/format';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export default function TourneeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tournee = useTourneeStore((s) => s.tournees.find((t) => t.id === id));
  const allStops = useTourneeStore((s) => s.stops);
  const startTournee = useTourneeStore((s) => s.startTournee);
  const deleteTournee = useTourneeStore((s) => s.deleteTournee);

  const onDelete = () => {
    if (!id) return;
    Alert.alert('Supprimer la tournée', 'Cette action est définitive. Supprimer cette tournée et ses arrêts ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteTournee(id);
          router.back();
        },
      },
    ]);
  };

  const stops = useMemo(
    () => allStops.filter((s) => s.tourneeId === id).sort((a, b) => a.order - b.order),
    [allStops, id],
  );
  const { polyline } = useRoutePolyline(stops);

  if (!tournee) {
    return (
      <Screen padded edges={['top', 'bottom']}>
        <Text style={styles.notFound}>Tournée introuvable.</Text>
      </Screen>
    );
  }

  const meta = tourneeStatusMeta[tournee.status];
  const progress = tournee.stopsCount ? tournee.deliveredCount / tournee.stopsCount : 0;

  const onPrimary = async () => {
    if (tournee.status === 'completed') {
      router.push(`/tournees/${tournee.id}/reuse`);
      return;
    }
    if (tournee.status === 'planned') await startTournee(tournee.id);
    router.push(`/tournees/${tournee.id}/execute`);
  };

  const primaryLabel =
    tournee.status === 'completed'
      ? 'Réutiliser la tournée'
      : tournee.status === 'active'
        ? 'Reprendre la tournée'
        : 'Démarrer la tournée';

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.headerRight}>
          <Badge label={meta.label} variant={meta.badge} dot={tournee.status === 'active'} />
          <Pressable onPress={() => router.push(`/tournees/${tournee.id}/edit`)} hitSlop={layout.hitSlop} style={styles.deleteBtn}>
            <Ionicons name="create-outline" size={20} color={colors.white} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={layout.hitSlop} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={stops}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StopCard stop={item} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.title}>{tournee.name}</Text>

            <View style={styles.statsRow}>
              <Stat icon="cube-outline" label="Stops" value={`${tournee.stopsCount}`} />
              <Stat icon="navigate-outline" label="Distance" value={`${tournee.distanceKm} km`} />
              <Stat icon="time-outline" label="Durée" value={formatDuration(tournee.estimatedDurationMin)} />
            </View>

            <Pressable onPress={() => router.push(`/tournees/${tournee.id}/map`)} style={styles.mapWrap}>
              <StopsMap stops={stops} interactive={false} showRoute routePolyline={polyline ?? undefined} style={styles.map} />
              <View style={styles.mapExpand} pointerEvents="none">
                <Ionicons name="expand-outline" size={16} color={colors.white} />
                <Text style={styles.mapExpandText}>Voir en grand</Text>
              </View>
            </Pressable>

            <View style={styles.progressBlock}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progression</Text>
                <Text style={styles.progressValue}>
                  {tournee.deliveredCount}/{tournee.stopsCount}
                </Text>
              </View>
              <ProgressBar progress={progress} />
            </View>

            <Text style={styles.sectionTitle}>Arrêts ({stops.length})</Text>
          </View>
        }
      />

      {/* Sticky CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={primaryLabel}
          icon={tournee.status === 'completed' ? 'refresh' : 'play'}
          size="lg"
          onPress={onPrimary}
        />
      </View>
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding - 6,
    paddingRight: layout.screenPadding,
    height: 48,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: spacing.huge },
  list: { paddingHorizontal: layout.screenPadding },
  listHeader: { paddingTop: spacing.sm },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.white, marginBottom: spacing.lg },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.heading, fontSize: 16, color: colors.white },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  mapWrap: { marginBottom: spacing.lg },
  map: { height: 170 },
  mapExpand: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  mapExpandText: { fontFamily: fonts.medium, fontSize: 11, color: colors.white },
  progressBlock: { gap: spacing.sm, marginBottom: spacing.xl },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  progressValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.white, marginBottom: spacing.md },
  sep: { height: spacing.md },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
