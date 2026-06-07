import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Avatar,
  Badge,
  Button,
  Card,
  KpiCard,
  ProgressBar,
  Screen,
  Skeleton,
  StopsMap,
} from '@/components';
import { useAuthStore, useTourneeStore, useUiStore } from '@/stores';
import { fakeDelay } from '@/mocks';
import { useStats } from '@/hooks/useStats';
import { formatDate, formatDuration } from '@/utils/format';
import { tourneeStatusMeta } from '@/utils/status';
import { useSimulatedLoad } from '@/utils/useSimulatedLoad';
import { colors, fonts, layout, radius, spacing } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tournees = useTourneeStore((s) => s.tournees);
  const allStops = useTourneeStore((s) => s.stops);
  const unread = useUiStore((s) => s.unreadCount());
  const { stats } = useStats();
  const loading = useSimulatedLoad();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fakeDelay(900);
    setRefreshing(false);
  }, []);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Livreur';
  const active = tournees.find((t) => t.status === 'active');
  const lastDone = tournees.find((t) => t.status === 'completed');
  const activeStops = active ? allStops.filter((s) => s.tourneeId === active.id) : [];
  const progress = active ? active.deliveredCount / active.stopsCount : 0;
  const remaining = active ? active.stopsCount - active.deliveredCount - active.failedCount : 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour, {firstName} 👋</Text>
            <Text style={styles.date}>{formatDate(new Date().toISOString())}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={styles.bell}
              hitSlop={layout.hitSlop}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
              {unread > 0 && <View style={styles.bellDot} />}
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/profile')}>
              <Avatar name={user?.full_name} uri={user?.avatar_url} size={44} online />
            </Pressable>
          </View>
        </Animated.View>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
        {/* KPIs */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.kpiGrid}>
          <KpiCard label="Livraisons" value={stats.deliveriesToday} icon="cube" trend={12} />
          <KpiCard label="Taux de succès" value={stats.successRate} unit="%" icon="checkmark-done" iconColor={colors.primary} trend={3} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.kpiGrid}>
          <KpiCard label="Distance" value={stats.distanceKm} unit="km" icon="navigate" iconColor={colors.info} />
          <KpiCard label="Temps" value={formatDuration(stats.durationMin)} icon="time" iconColor={colors.warning} />
        </Animated.View>

        {/* Active tournee */}
        {active && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Tournée en cours</Text>
            <Card elevation="high" padded style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View style={styles.flex1}>
                  <Text style={styles.tourneeName} numberOfLines={1}>{active.name}</Text>
                  <Text style={styles.tourneeMeta}>
                    {active.distanceKm} km · {formatDuration(active.estimatedDurationMin)}
                  </Text>
                </View>
                <Badge label={tourneeStatusMeta[active.status].label} variant="success" dot />
              </View>

              <View style={styles.progressGroup}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {active.deliveredCount}/{active.stopsCount} stops livrés
                  </Text>
                  <Text style={styles.remaining}>{remaining} restants</Text>
                </View>
                <ProgressBar progress={progress} />
              </View>

              {/* Mini map */}
              <Pressable onPress={() => router.push('/(tabs)/map')}>
                <StopsMap stops={activeStops} interactive={false} style={styles.map} />
              </Pressable>

              <Button
                label="Reprendre la tournée"
                icon="play"
                size="lg"
                onPress={() => router.push(`/tournees/${active.id}/execute`)}
                style={styles.resume}
              />
            </Card>
          </Animated.View>
        )}

        {/* Last tournee */}
        {lastDone && (
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.section}>
            <Text style={styles.sectionTitle}>Dernière tournée</Text>
            <Card onPress={() => router.push(`/tournees/${lastDone.id}`)} style={styles.lastCard}>
              <View style={styles.lastIcon}>
                <Ionicons name="checkmark-done-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.lastName} numberOfLines={1}>{lastDone.name}</Text>
                <Text style={styles.lastMeta}>
                  {lastDone.stopsCount} stops · 100% réussite · {lastDone.distanceKm} km
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Animated.View>
        )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function DashboardSkeleton() {
  return (
    <View>
      <View style={styles.kpiGrid}>
        <Skeleton height={116} rounded={radius.lg} style={styles.flex1} />
        <Skeleton height={116} rounded={radius.lg} style={styles.flex1} />
      </View>
      <View style={styles.kpiGrid}>
        <Skeleton height={116} rounded={radius.lg} style={styles.flex1} />
        <Skeleton height={116} rounded={radius.lg} style={styles.flex1} />
      </View>
      <Skeleton height={18} width="48%" style={styles.skelTitle} />
      <Skeleton height={320} rounded={radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.huge },
  skelTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxl },
  headerLeft: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: 24, color: colors.white },
  date: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  kpiGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.white, marginBottom: spacing.md },
  activeCard: { gap: spacing.lg },
  activeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex1: { flex: 1 },
  tourneeName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  tourneeMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  progressGroup: { gap: spacing.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  remaining: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  map: { height: 160 },
  resume: { marginTop: spacing.xs },
  lastCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lastIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  lastMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
});
