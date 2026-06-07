import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, SkeletonCard, TourneeCard } from '@/components';
import { useTourneeStore } from '@/stores';
import { fakeDelay } from '@/mocks';
import { useSimulatedLoad } from '@/utils/useSimulatedLoad';
import { colors, fonts, layout, radius, shadows, spacing } from '@/theme';
import type { Tournee } from '@/types';

const ORDER: Record<Tournee['status'], number> = { active: 0, planned: 1, completed: 2 };

type FilterKey = 'all' | Tournee['status'];
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'En cours' },
  { key: 'planned', label: 'Planifiées' },
  { key: 'completed', label: 'Terminées' },
];

export default function TourneesListScreen() {
  const router = useRouter();
  const tournees = useTourneeStore((s) => s.tournees);
  const loading = useSimulatedLoad();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...tournees]
      .filter((t) => (filter === 'all' ? true : t.status === filter))
      .filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  }, [tournees, query, filter]);

  const openCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/tournees/create');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fakeDelay(900);
    setRefreshing(false);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tournées</Text>
          <Text style={styles.subtitle}>{tournees.length} tournées</Text>
        </View>
        <Pressable onPress={openCreate} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <Ionicons name="add" size={26} color={colors.background} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une tournée…"
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={layout.hitSlop}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.key);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(t) => t.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(380).delay(index * 70)}>
              <TourneeCard tournee={item} onPress={() => router.push(`/tournees/${item.id}`)} />
            </Animated.View>
          )}
          contentContainerStyle={[styles.list, sorted.length === 0 && styles.listEmpty]}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={query || filter !== 'all' ? 'search-outline' : 'map-outline'}
                  size={32}
                  color={colors.muted}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {query || filter !== 'all' ? 'Aucun résultat' : 'Aucune tournée'}
              </Text>
              <Text style={styles.emptyText}>
                {query || filter !== 'all'
                  ? 'Essayez un autre filtre ou une autre recherche.'
                  : 'Créez votre première tournée avec le bouton ＋.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.screenPadding,
    paddingHorizontal: spacing.md,
    height: 46,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.white, paddingVertical: 0 },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: layout.screenPadding, paddingVertical: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.primary },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.huge },
  listEmpty: { flexGrow: 1 },
  sep: { height: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.huge * 2, gap: spacing.md },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xxl },
});

