import React from 'react';
import { StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';
import { colors, fonts, radius, spacing } from '@/theme';
import type { LatLng } from '@/utils/optimize';
import type { Stop } from '@/types';

export interface StopsMapProps {
  stops: Stop[];
  center?: { latitude: number; longitude: number };
  latitudeDelta?: number;
  longitudeDelta?: number;
  interactive?: boolean;
  onMarkerPress?: (stop: Stop) => void;
  highlightStopId?: string;
  showRoute?: boolean;
  routePolyline?: LatLng[];
  start?: { lat: number; lng: number };
  style?: StyleProp<ViewStyle>;
}

/**
 * Web fallback for StopsMap (react-native-maps has no web build).
 * Renders a stylised dark "map" with markers positioned from real coordinates.
 */
export function StopsMap({
  stops,
  highlightStopId,
  showRoute = false,
  routePolyline,
  start,
  style,
}: StopsMapProps) {
  const extra = [...(start ? [start] : []), ...(routePolyline ?? [])];
  const lats = [...stops.map((s) => s.lat), ...extra.map((p) => p.lat)];
  const lngs = [...stops.map((s) => s.lng), ...extra.map((p) => p.lng)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  const xy = (p: { lat: number; lng: number }) => ({
    x: 8 + ((p.lng - minLng) / lngRange) * 84,
    y: 8 + ((maxLat - p.lat) / latRange) * 84,
  });
  const pos = (stop: Stop): { left: DimensionValue; top: DimensionValue } => {
    const { x, y } = xy(stop);
    return { left: `${x}%`, top: `${y}%` };
  };
  const startXY = start ? xy(start) : null;
  const lineSource =
    routePolyline && routePolyline.length > 1
      ? routePolyline
      : [
          ...(start ? [start] : []),
          ...[...stops].sort((a, b) => a.order - b.order).map((s) => ({ lat: s.lat, lng: s.lng })),
        ];
  const routePoints = lineSource.map((p) => { const { x, y } = xy(p); return `${x},${y}`; }).join(' ');

  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={['#141B2E', '#0A0F1E']} style={StyleSheet.absoluteFill} />
      {showRoute && stops.length > 1 && (
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Polyline points={routePoints} fill="none" stroke={colors.primary} strokeWidth={0.6} />
        </Svg>
      )}
      {startXY && (
        <View style={[styles.startWrap, { left: `${startXY.x}%`, top: `${startXY.y}%` }]}>
          <View style={styles.startDot} />
        </View>
      )}
      {/* grid */}
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 16}%` }]} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16}%` }]} />
        ))}
      </View>

      {stops.map((stop) => {
        const isCurrent = stop.id === highlightStopId;
        return (
          <View key={stop.id} style={[styles.marker, pos(stop), isCurrent && styles.markerCurrentWrap]}>
            <View
              style={[
                styles.pin,
                { borderColor: colors.danger, backgroundColor: colors.danger },
                isCurrent && { borderColor: colors.primary, backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.pinText, { color: colors.white }]}>{stop.order}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.badge} pointerEvents="none">
        <Ionicons name="map-outline" size={13} color={colors.muted} />
        <Text style={styles.badgeText}>Aperçu — carte interactive sur mobile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  marker: { position: 'absolute', transform: [{ translateX: -13 }, { translateY: -13 }] },
  startWrap: {
    position: 'absolute',
    width: 20,
    height: 20,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    borderRadius: 10,
    backgroundColor: 'rgba(0,212,106,0.25)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  markerCurrentWrap: { zIndex: 10 },
  pin: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 13,
    borderWidth: 2,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { fontFamily: fonts.heading, fontSize: 12 },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
});
