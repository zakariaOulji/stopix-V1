import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';
import { colors, fonts, spacing } from '@/theme';
import { tourneeStatusMeta } from '@/utils/status';
import { formatDuration, relativeDay } from '@/utils/format';
import type { Tournee } from '@/types';

export interface TourneeCardProps {
  tournee: Tournee;
  onPress?: () => void;
}

export function TourneeCard({ tournee, onPress }: TourneeCardProps) {
  const meta = tourneeStatusMeta[tournee.status];
  const isActive = tournee.status === 'active';
  const isDone = tournee.status === 'completed';
  const progress = tournee.stopsCount ? tournee.deliveredCount / tournee.stopsCount : 0;

  return (
    <Card onPress={onPress} elevation={isActive ? 'high' : 'low'} style={isActive ? styles.activeBorder : undefined}>
      <View style={styles.top}>
        <View style={styles.flex1}>
          <Text style={styles.day}>{relativeDay(tournee.date)}</Text>
          <Text style={styles.name} numberOfLines={1}>{tournee.name}</Text>
        </View>
        <Badge label={meta.label} variant={meta.badge} dot={isActive} />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="cube-outline" text={`${tournee.stopsCount} stops`} />
        <Meta icon="navigate-outline" text={`${tournee.distanceKm} km`} />
        <Meta icon="time-outline" text={formatDuration(tournee.estimatedDurationMin)} />
      </View>

      {(isActive || isDone) && (
        <View style={styles.progressWrap}>
          <ProgressBar progress={isDone ? 1 : progress} height={6} />
          <Text style={styles.progressText}>
            {isDone
              ? `${tournee.deliveredCount}/${tournee.stopsCount} livrés · 100%`
              : `${tournee.deliveredCount}/${tournee.stopsCount} livrés`}
          </Text>
        </View>
      )}
    </Card>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  activeBorder: { borderColor: colors.primary },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex1: { flex: 1 },
  day: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  progressWrap: { marginTop: spacing.lg, gap: spacing.sm },
  progressText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
