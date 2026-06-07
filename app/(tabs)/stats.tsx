import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Card, Screen } from '@/components';
import { useStats } from '@/hooks/useStats';
import { formatDuration } from '@/utils/format';
import { colors, fonts, gradients, layout, radius, spacing } from '@/theme';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CHART_HEIGHT = 130;

export default function StatsScreen() {
  const { stats } = useStats();
  const week = stats.weeklyDeliveries;
  const weekTotal = week.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...week, 1);
  // JS getDay(): 0=Sun..6=Sat -> Mon-based index 0..6
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Statistiques</Text>

        {/* Weekly summary banner */}
        <Card elevation="high" padded={false} style={styles.bannerWrap}>
          <LinearGradient colors={gradients.surface} style={styles.banner}>
            <View>
              <Text style={styles.bannerLabel}>Cette semaine</Text>
              <Text style={styles.bannerValue}>{weekTotal} livraisons</Text>
            </View>
            <View style={styles.bannerTrend}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.bannerTrendText}>+8%</Text>
            </View>
          </LinearGradient>
        </Card>

        {/* Bar chart */}
        <Card elevation="mid" style={styles.chartCard}>
          <Text style={styles.cardTitle}>Activité hebdomadaire</Text>
          <View style={styles.chart}>
            {week.map((v, i) => {
              const isToday = i === todayIdx;
              const h = Math.max((v / maxVal) * CHART_HEIGHT, 4);
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{v > 0 ? v : ''}</Text>
                  <View style={styles.barTrack}>
                    <AnimatedBar height={h} isToday={isToday} delay={i * 70} />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.barDayActive]}>{DAYS[i]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* KPI grid */}
        <View style={styles.grid}>
          <StatTile icon="checkmark-done" color={colors.primary} value={`${stats.successRate}%`} label="Taux de succès" />
          <StatTile icon="navigate" color={colors.info} value={`${stats.distanceKm}`} unit="km" label="Distance" />
        </View>
        <View style={styles.grid}>
          <StatTile icon="time" color={colors.warning} value={formatDuration(stats.durationMin)} label="Temps de conduite" />
          <StatTile icon="leaf" color={colors.primary} value={`${stats.co2Saved}`} unit="kg" label="CO₂ économisé" />
        </View>

        {/* Highlight */}
        <Card elevation="mid" style={styles.highlight}>
          <View style={styles.highlightIcon}>
            <Ionicons name="trophy" size={22} color={colors.warning} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.highlightTitle}>Belle performance !</Text>
            <Text style={styles.highlightText}>
              Vous êtes au-dessus de 90% de réussite cette semaine. Continuez comme ça 💪
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function AnimatedBar({ height, isToday, delay }: { height: number; isToday: boolean; delay: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(height, { duration: 650 }));
  }, [height, delay]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View style={[styles.bar, style, !isToday && { backgroundColor: colors.surfaceHigh }]}>
      {isToday && <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />}
    </Animated.View>
  );
}

function StatTile({
  icon,
  color,
  value,
  unit,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <Card elevation="mid" style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{value}</Text>
        {unit && <Text style={styles.tileUnit}>{unit}</Text>}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.huge },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.white, marginBottom: spacing.lg },
  bannerWrap: { overflow: 'hidden', padding: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  bannerLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  bannerValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.white, marginTop: 4 },
  bannerTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  bannerTrendText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },

  chartCard: { marginTop: spacing.md },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white, marginBottom: spacing.lg },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 44 },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.sm },
  barValue: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, height: 14 },
  barTrack: { height: CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 8, overflow: 'hidden' },
  barDay: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  barDayActive: { color: colors.primary, fontFamily: fonts.semibold },

  grid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  tile: { flex: 1, gap: spacing.sm },
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  tileValue: { fontFamily: fonts.heading, fontSize: 24, color: colors.white },
  tileUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginLeft: 3 },
  tileLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
  highlightTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  highlightText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
