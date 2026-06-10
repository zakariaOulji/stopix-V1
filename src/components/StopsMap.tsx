import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, type Region, type MapStyleElement } from 'react-native-maps';
import { colors, fonts, radius } from '@/theme';
import { darkMapStyle } from '@/theme/mapStyle';
import { stopStatusMeta } from '@/utils/status';
import type { Stop } from '@/types';

export interface StopsMapProps {
  stops: Stop[];
  center?: { latitude: number; longitude: number };
  latitudeDelta?: number;
  longitudeDelta?: number;
  interactive?: boolean;
  onMarkerPress?: (stop: Stop) => void;
  /** Highlighted (current) stop — enlarged marker; map recenters on it when it changes. */
  highlightStopId?: string;
  /** Draw a line connecting the stops in order (to visualise the route). */
  showRoute?: boolean;
  style?: StyleProp<ViewStyle>;
}

function computeRegion(
  stops: Stop[],
  center?: { latitude: number; longitude: number },
  latDelta = 0.03,
  lngDelta = 0.03,
): Region {
  if (center) return { ...center, latitudeDelta: latDelta, longitudeDelta: lngDelta };
  if (stops.length === 0) {
    return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: latDelta, longitudeDelta: lngDelta };
  }
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.01),
  };
}

export function StopsMap({
  stops,
  center,
  latitudeDelta,
  longitudeDelta,
  interactive = true,
  onMarkerPress,
  highlightStopId,
  showRoute = false,
  style,
}: StopsMapProps) {
  const mapRef = useRef<MapView>(null);
  const routeCoords = useMemo(
    () =>
      [...stops]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ latitude: s.lat, longitude: s.lng })),
    [stops],
  );
  const region = useMemo(
    () => computeRegion(stops, center, latitudeDelta, longitudeDelta),
    [stops, center, latitudeDelta, longitudeDelta],
  );

  // Recenter on the highlighted stop when it changes.
  const highlight = stops.find((s) => s.id === highlightStopId);
  useEffect(() => {
    if (highlight) {
      mapRef.current?.animateToRegion(
        {
          latitude: highlight.lat,
          longitude: highlight.lng,
          latitudeDelta: latitudeDelta ?? 0.012,
          longitudeDelta: longitudeDelta ?? 0.012,
        },
        500,
      );
    }
  }, [highlight?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        customMapStyle={darkMapStyle as unknown as MapStyleElement[]}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
      >
        {showRoute && routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={3} />
        )}
        {stops.map((stop) => {
          const meta = stopStatusMeta[stop.status];
          const isCurrent = stop.id === highlightStopId;
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              onPress={() => onMarkerPress?.(stop)}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={isCurrent ? 99 : 1}
              tracksViewChanges={isCurrent}
            >
              <View
                style={[
                  styles.marker,
                  { borderColor: meta.color, backgroundColor: colors.surface },
                  isCurrent && styles.markerCurrent,
                ]}
              >
                <Text style={[styles.markerText, { color: isCurrent ? colors.background : meta.color }]}>
                  {stop.order}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface },
  marker: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCurrent: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  markerText: { fontFamily: fonts.heading, fontSize: 12 },
});
