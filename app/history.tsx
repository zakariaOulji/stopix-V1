import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { Badge, BottomSheet, Screen, Spinner } from '@/components';
import { historyService, type HistoryFilter } from '@/services';
import { useProofUrl } from '@/hooks/useProofUrl';
import { failureReasonMeta, stopStatusMeta } from '@/utils/status';
import { relativeDay } from '@/utils/format';
import type { DeliveryRecord } from '@/types';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'delivered', label: 'Livrés' },
  { key: 'failed', label: 'Échecs' },
  { key: 'skipped', label: 'Reportés' },
];

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const returnsLabel = (r: DeliveryRecord) =>
  [r.returnVrac ? `${r.returnVrac} vrac` : null, r.returnBags ? `${r.returnBags} sac${r.returnBags > 1 ? 's' : ''}` : null]
    .filter(Boolean)
    .join(' · ');

interface Section {
  key: string;
  title: string;
  delivered: number;
  failed: number;
  data: DeliveryRecord[];
}

/** Group by local day, most recent first (records arrive sorted). */
function toSections(records: DeliveryRecord[]): Section[] {
  const sections: Section[] = [];
  records.forEach((r) => {
    const key = dayKey(r.happenedAt);
    let section = sections[sections.length - 1];
    if (!section || section.key !== key) {
      section = { key, title: relativeDay(r.happenedAt), delivered: 0, failed: 0, data: [] };
      sections.push(section);
    }
    section.data.push(r);
    if (r.status === 'delivered') section.delivered += 1;
    if (r.status === 'failed') section.failed += 1;
  });
  return sections;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliveryRecord | null>(null);

  const load = useCallback(async (f: HistoryFilter) => {
    setLoading(true);
    setError(null);
    try {
      const page = await historyService.getDeliveries({ filter: f });
      setRecords(page.records);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRecords([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const loadMore = async () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await historyService.getDeliveries({ filter, before: cursor });
      setRecords((r) => [...r, ...page.records]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const sections = useMemo(() => toSections(records), [records]);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={layout.hitSlop} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Historique des livraisons</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Spinner size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, sections.length === 0 && styles.listEmpty]}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionMeta}>
                {section.delivered} livré{section.delivered > 1 ? 's' : ''}
                {section.failed ? ` · ${section.failed} échec${section.failed > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
          )}
          renderItem={({ item }) => <HistoryRow record={item} onPress={() => setSelected(item)} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={error ? 'cloud-offline-outline' : 'time-outline'} size={32} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>{error ? 'Historique indisponible' : 'Aucune livraison'}</Text>
              <Text style={styles.emptyText}>
                {error ?? 'Les arrêts livrés, en échec ou reportés apparaîtront ici.'}
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <View style={styles.footer}><Spinner /></View> : null}
        />
      )}

      <DeliveryDetailSheet record={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function HistoryRow({ record, onPress }: { record: DeliveryRecord; onPress: () => void }) {
  const meta = stopStatusMeta[record.status];
  const returns = returnsLabel(record);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowTime}>
        <Text style={styles.timeText}>{time(record.happenedAt)}</Text>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={meta.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.recipient} numberOfLines={1}>{record.recipient}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {record.address}{record.postalCode ? `, ${record.postalCode}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>{record.tourneeName}</Text>
          {record.status === 'failed' && record.failureReason && (
            <Text style={[styles.metaText, { color: colors.danger }]}>· {failureReasonMeta[record.failureReason].label}</Text>
          )}
          {!!returns && (
            <View style={styles.inline}>
              <Ionicons name="return-down-back" size={12} color={colors.warning} />
              <Text style={styles.metaText}>{returns}</Text>
            </View>
          )}
          {record.proofUrl && <Ionicons name="camera" size={13} color={colors.primary} />}
          {record.signatureUrl && <Ionicons name="create" size={13} color={colors.primary} />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function DeliveryDetailSheet({ record, onClose }: { record: DeliveryRecord | null; onClose: () => void }) {
  const photo = useProofUrl(record?.proofUrl);
  const signatureUrl = useProofUrl(record?.signatureUrl);
  const [signatureXml, setSignatureXml] = useState<string | null>(null);

  // Signatures are SVG documents: fetch the text to render it inline.
  useEffect(() => {
    setSignatureXml(null);
    if (!signatureUrl.url) return;
    let active = true;
    fetch(signatureUrl.url)
      .then((r) => r.text())
      .then((xml) => active && setSignatureXml(xml))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [signatureUrl.url]);

  if (!record) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const meta = stopStatusMeta[record.status];
  const returns = returnsLabel(record);
  const hasGps = record.proofLat != null && record.proofLng != null;
  const when = new Date(record.happenedAt).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <BottomSheet visible onClose={onClose} title={record.recipient}>
      <View style={styles.detail}>
        <View style={styles.detailHead}>
          <Badge label={meta.label} variant={meta.badge} dot />
          <Text style={styles.detailWhen}>{when}</Text>
        </View>

        <DetailLine icon="location-outline" text={`${record.address}${record.postalCode ? `, ${record.postalCode}` : ''} ${record.city}`.trim()} />
        <DetailLine icon="map-outline" text={record.tourneeName} />
        <DetailLine
          icon="cube-outline"
          text={`${record.packages} colis${record.vrac ? ` · ${record.vrac} vrac` : ''}`}
        />
        {record.status === 'failed' && record.failureReason && (
          <DetailLine icon="alert-circle-outline" text={failureReasonMeta[record.failureReason].label} color={colors.danger} />
        )}
        {!!returns && <DetailLine icon="return-down-back" text={`Retours : ${returns}`} color={colors.warning} />}
        {hasGps && (
          <Pressable
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${record.proofLat},${record.proofLng}`)}
            accessibilityRole="link"
          >
            <DetailLine
              icon="navigate-outline"
              text={`Position à la livraison : ${record.proofLat!.toFixed(5)}, ${record.proofLng!.toFixed(5)}`}
              color={colors.info}
            />
          </Pressable>
        )}

        {(record.proofUrl || record.signatureUrl) && (
          <View style={styles.proofs}>
            {record.proofUrl && (
              <ProofFrame label="Photo" error={photo.error}>
                {photo.url ? <Image source={{ uri: photo.url }} style={styles.proofImage} resizeMode="cover" /> : <Spinner />}
              </ProofFrame>
            )}
            {record.signatureUrl && (
              <ProofFrame label="Signature" error={signatureUrl.error}>
                {signatureXml ? <SvgXml xml={signatureXml} width="100%" height="100%" /> : <Spinner />}
              </ProofFrame>
            )}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function DetailLine({ icon, text, color = colors.muted }: { icon: keyof typeof Ionicons.glyphMap; text: string; color?: string }) {
  return (
    <View style={styles.detailLine}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.detailText, color !== colors.muted && { color }]}>{text}</Text>
    </View>
  );
}

function ProofFrame({ label, error, children }: { label: string; error: string | null; children: React.ReactNode }) {
  return (
    <View style={styles.proofWrap}>
      <Text style={styles.proofLabel}>{label}</Text>
      <View style={styles.proofBox}>
        {error ? <Text style={styles.proofError}>Indisponible</Text> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: layout.screenPadding - 6,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.huge },
  listEmpty: { flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.white, textTransform: 'capitalize' },
  sectionMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  sep: { height: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  rowTime: { width: 46, alignItems: 'center', gap: 4 },
  timeText: { fontFamily: fonts.heading, fontSize: 13, color: colors.white },
  rowBody: { flex: 1, gap: 2 },
  recipient: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.huge },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', maxWidth: 280 },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  detail: { gap: spacing.sm },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs, flexWrap: 'wrap' },
  detailWhen: { fontFamily: fonts.medium, fontSize: 13, color: colors.white, textTransform: 'capitalize' },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  proofs: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  proofWrap: { flex: 1, gap: 4 },
  proofLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  proofBox: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofImage: { width: '100%', height: '100%' },
  proofError: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
