import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen, Spinner } from '@/components';
import { useTourneeStore } from '@/stores';
import { colors, fonts, layout, radius, spacing } from '@/theme';

type Qty = { packages: number; vrac: number };

export default function ReuseTourneeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tournee = useTourneeStore((s) => s.tournees.find((t) => t.id === id));
  const allStops = useTourneeStore((s) => s.stops);
  const reuseTournee = useTourneeStore((s) => s.reuseTournee);
  const ensureStops = useTourneeStore((s) => s.ensureStops);

  const stops = useMemo(
    () => allStops.filter((s) => s.tourneeId === id).sort((a, b) => a.order - b.order),
    [allStops, id],
  );

  const [qty, setQty] = useState<Record<string, Qty>>({});
  const [loadingStops, setLoadingStops] = useState(stops.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  // Stops of a completed tournée are not loaded at startup: fetch them here.
  useEffect(() => {
    if (!id) return;
    let active = true;
    ensureStops(id)
      .catch((e: unknown) => active && setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoadingStops(false));
    return () => {
      active = false;
    };
  }, [id, ensureStops]);

  // Prefill with the last quantities once stops are available (without overwriting edits).
  useEffect(() => {
    setQty((q) => {
      const next = { ...q };
      stops.forEach((s) => {
        if (!next[s.id]) next[s.id] = { packages: s.packages ?? 1, vrac: s.vrac ?? 0 };
      });
      return next;
    });
  }, [stops]);

  const setQ = (stopId: string, patch: Partial<Qty>) =>
    setQty((q) => ({ ...q, [stopId]: { ...q[stopId], ...patch } }));

  const totalColis = stops.reduce((n, s) => n + (qty[s.id]?.packages ?? 0), 0);
  const totalVrac = stops.reduce((n, s) => n + (qty[s.id]?.vrac ?? 0), 0);

  const launch = async () => {
    if (!id || stops.length === 0) return;
    setLaunching(true);
    try {
      await reuseTournee(id, qty);
      router.replace(`/tournees/${id}/execute`);
    } catch (e) {
      setLaunching(false);
      Alert.alert('Relance impossible', e instanceof Error ? e.message : 'Réessayez.');
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{tournee?.name ?? 'Réutiliser'}</Text>
        <View style={styles.back} />
      </View>

      <Text style={styles.subtitle}>Quantités d’aujourd’hui pour chaque arrêt.</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {stops.length === 0 && (
          <View style={styles.empty}>
            {loadingStops ? (
              <Spinner size="large" />
            ) : (
              <Text style={styles.emptyText}>
                {loadError ? `Impossible de charger les arrêts : ${loadError}` : 'Aucun arrêt dans cette tournée.'}
              </Text>
            )}
          </View>
        )}
        {stops.map((s, i) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{i + 1}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.recipient} numberOfLines={1}>{s.recipient}</Text>
                <Text style={styles.address} numberOfLines={1}>{s.address}, {s.postalCode}</Text>
              </View>
            </View>
            <View style={styles.qtyRow}>
              <Stepper label="Colis" value={qty[s.id]?.packages ?? 0} onChange={(n) => setQ(s.id, { packages: n })} />
              <Stepper label="Vrac" value={qty[s.id]?.vrac ?? 0} onChange={(n) => setQ(s.id, { vrac: n })} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.totals}>{stops.length} stops · {totalColis} colis · {totalVrac} vrac</Text>
        <Button label="Relancer la tournée" size="lg" icon="rocket" loading={launching} disabled={stops.length === 0} onPress={launch} />
      </View>
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn} hitSlop={6}>
          <Ionicons name="remove" size={18} color={colors.white} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(value + 1)} style={styles.stepBtn} hitSlop={6}>
          <Ionicons name="add" size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: layout.screenPadding - 6 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingHorizontal: layout.screenPadding, marginTop: spacing.sm },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orderBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  orderBadgeText: { fontFamily: fonts.heading, fontSize: 13, color: colors.primary },
  flex1: { flex: 1 },
  recipient: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', gap: spacing.md },
  stepperWrap: { flex: 1, gap: 4 },
  stepperLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginLeft: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, padding: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: fonts.heading, fontSize: 16, color: colors.white, minWidth: 24, textAlign: 'center' },
  empty: { paddingVertical: spacing.huge, alignItems: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: spacing.sm },
  totals: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
