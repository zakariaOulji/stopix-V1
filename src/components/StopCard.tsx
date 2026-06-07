import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';
import { stopStatusMeta } from '@/utils/status';
import { Badge } from './Badge';
import type { Stop } from '@/types';

export interface StopCardProps {
  stop: Stop;
  onPress?: () => void;
  /** Highlight as the current stop in execution. */
  active?: boolean;
  showStatusBadge?: boolean;
}

export function StopCard({ stop, onPress, active = false, showStatusBadge = true }: StopCardProps) {
  const meta = stopStatusMeta[stop.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && onPress && styles.pressed,
      ]}
    >
      {/* Order index disc */}
      <View style={[styles.index, { borderColor: meta.color }]}>
        {stop.status === 'delivered' ? (
          <Ionicons name="checkmark" size={16} color={meta.color} />
        ) : stop.status === 'failed' ? (
          <Ionicons name="close" size={16} color={meta.color} />
        ) : (
          <Text style={[styles.indexText, { color: meta.color }]}>{stop.order}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.recipient} numberOfLines={1}>
            {stop.recipient}
          </Text>
          {stop.eta && <Text style={styles.eta}>{stop.eta}</Text>}
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {stop.address}, {stop.postalCode}
        </Text>

        <View style={styles.metaRow}>
          {showStatusBadge && <Badge label={meta.label} variant={meta.badge} dot />}
          <View style={styles.pkg}>
            <Ionicons name="cube-outline" size={13} color={colors.muted} />
            <Text style={styles.pkgText}>
              {stop.packages} colis
            </Text>
          </View>
          {stop.accessCode && (
            <View style={styles.pkg}>
              <Ionicons name="keypad-outline" size={13} color={colors.muted} />
              <Text style={styles.pkgText}>{stop.accessCode}</Text>
            </View>
          )}
        </View>
      </View>

      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHigh },
  pressed: { opacity: 0.85 },
  index: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  indexText: { fontFamily: fonts.heading, fontSize: 14 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipient: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white, flex: 1 },
  eta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginLeft: spacing.sm },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pkgText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
