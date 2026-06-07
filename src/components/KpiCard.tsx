import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, fonts } from '@/theme';

/** Eased count-up from 0 to target on mount. */
function useCountUp(target: number, duration = 750): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);
  return val;
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Positive = up/green, negative = down/red. */
  trend?: number;
}

export function KpiCard({ label, value, unit, icon, iconColor = colors.primary, trend }: KpiCardProps) {
  const trendUp = (trend ?? 0) >= 0;
  const isNumber = typeof value === 'number';
  const counted = useCountUp(isNumber ? value : 0);
  const display = isNumber ? Math.round(counted).toString() : value;
  return (
    <Card elevation="mid" style={styles.card}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}22` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        )}
        {trend !== undefined && (
          <View style={styles.trend}>
            <Ionicons
              name={trendUp ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendUp ? colors.primary : colors.danger}
            />
            <Text style={[styles.trendText, { color: trendUp ? colors.primary : colors.danger }]}>
              {trendUp ? '+' : ''}
              {trend}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1}>
          {display}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 116 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trend: { flexDirection: 'row', alignItems: 'center' },
  trendText: { fontFamily: fonts.semibold, fontSize: 12, marginLeft: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14 },
  value: { fontFamily: fonts.heading, fontSize: 28, color: colors.white },
  unit: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginLeft: 4 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
});
