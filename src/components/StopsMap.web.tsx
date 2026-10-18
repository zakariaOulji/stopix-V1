import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors, fonts, radius, shadows } from '@/theme';
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
  showUserLocation?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard OpenStreetMap tiles: no API key (CARTO's dark tiles now require one).
 * Fine for a beta; OSM's usage policy forbids heavy use, so switch to a keyed
 * provider (MapTiler, Stadia, Google Maps JS) before a wide launch.
 */
const TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/** Turns the light OSM style into a dark map matching the app theme. */
const DARK_TILES_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.85) saturate(0.6)';

const PARIS: L.LatLngTuple = [48.8566, 2.3522];
const FOCUS_ZOOM = 16;
/** Pixel distance between markers sharing the same address. */
const SPREAD_PX = 16;

const hasCoords = (p: { lat: number; lng: number }) =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0);

/**
 * Stops at (almost) the same coordinates — same building, ungeocoded duplicates —
 * would sit exactly on top of each other. Fan them out on a small circle, in
 * pixels, so every number stays readable at any zoom.
 */
function spreadOffsets(stops: Stop[]): Map<string, [number, number]> {
  const groups = new Map<string, Stop[]>();
  stops.forEach((s) => {
    const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  });
  const offsets = new Map<string, [number, number]>();
  groups.forEach((group) => {
    if (group.length === 1) {
      offsets.set(group[0].id, [0, 0]);
      return;
    }
    const r = (SPREAD_PX * group.length) / (2 * Math.PI) + SPREAD_PX / 2;
    [...group]
      .sort((a, b) => a.order - b.order)
      .forEach((s, i) => {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
        offsets.set(s.id, [Math.round(r * Math.cos(angle)), Math.round(r * Math.sin(angle))]);
      });
  });
  return offsets;
}

function stopIcon(stop: Stop, isCurrent: boolean, [dx, dy]: [number, number]): L.DivIcon {
  const size = isCurrent ? 34 : 26;
  const bg = isCurrent ? colors.primary : colors.danger;
  const done = stop.status !== 'pending' && !isCurrent;
  return L.divIcon({
    className: '', // drop Leaflet's default white square
    html: `<div style="
      min-width:${size}px;height:${size}px;padding:0 4px;box-sizing:border-box;
      border-radius:${size / 2}px;border:2px solid ${bg};background:${bg};
      display:flex;align-items:center;justify-content:center;
      color:${colors.white};font-family:${fonts.heading},sans-serif;font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,.45);opacity:${done ? 0.45 : 1};
    ">${stop.order}</div>`,
    iconSize: [size, size],
    // Anchor is the marker's true position; shifting it fans out duplicates.
    iconAnchor: [size / 2 - dx, size / 2 - dy],
  });
}

const startIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:11px;box-sizing:border-box;
    background:rgba(0,212,106,.25);border:1.5px solid ${colors.primary};
    display:flex;align-items:center;justify-content:center">
    <div style="width:9px;height:9px;border-radius:5px;background:${colors.primary}"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * Web version of StopsMap (react-native-maps has no web build): Leaflet +
 * OpenStreetMap, same props and marker look as the native map.
 */
export function StopsMap({
  stops,
  center,
  interactive = true,
  onMarkerPress,
  highlightStopId,
  showRoute = false,
  routePolyline,
  start,
  showUserLocation = false,
  style,
}: StopsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userRef = useRef<L.CircleMarker | null>(null);
  const framedRef = useRef<string | null>(null);
  const onPressRef = useRef(onMarkerPress);
  onPressRef.current = onMarkerPress;

  const placed = useMemo(() => stops.filter(hasCoords), [stops]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      // No +/- buttons: they collide with the screens' overlay buttons; pinch,
      // double-tap and the mouse wheel still zoom.
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    }).setView(PARIS, 12);
    const tiles = L.tileLayer(TILES_URL, { attribution: TILES_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const tilesEl = tiles.getContainer();
    if (tilesEl) tilesEl.style.filter = DARK_TILES_FILTER;
    map.attributionControl.setPrefix(false); // keep only the OSM credit
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    framedRef.current = null; // new map instance: frame it again

    // The RN-web container may get its final size after mount.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Draw route + markers, and frame everything.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const ordered = [...placed].sort((a, b) => a.order - b.order);
    const line: L.LatLngTuple[] =
      routePolyline && routePolyline.length > 1
        ? routePolyline.map((p) => [p.lat, p.lng])
        : [...(start ? [[start.lat, start.lng] as L.LatLngTuple] : []), ...ordered.map((s): L.LatLngTuple => [s.lat, s.lng])];
    if (showRoute && line.length > 1) {
      L.polyline(line, { color: colors.primary, weight: 4, opacity: 0.9 }).addTo(layer);
    }
    if (start && hasCoords(start)) {
      L.marker([start.lat, start.lng], { icon: startIcon, interactive: false, keyboard: false }).addTo(layer);
    }

    const offsets = spreadOffsets(ordered);
    ordered.forEach((stop) => {
      const isCurrent = stop.id === highlightStopId;
      L.marker([stop.lat, stop.lng], {
        icon: stopIcon(stop, isCurrent, offsets.get(stop.id) ?? [0, 0]),
        zIndexOffset: isCurrent ? 1000 : -stop.order, // lower numbers on top
        keyboard: false,
        title: `${stop.order}. ${stop.recipient}`,
      })
        .on('click', () => onPressRef.current?.(stop))
        .addTo(layer);
    });

    // Reframe only when what should be framed changes (not on every re-render,
    // which would undo the driver's own pan/zoom).
    const frameKey = [
      highlightStopId ?? '',
      center ? `${center.latitude},${center.longitude}` : '',
      start ? `${start.lat},${start.lng}` : '',
      ordered.map((s) => `${s.id}@${s.lat},${s.lng}`).join('|'),
    ].join('#');
    if (frameKey === framedRef.current) return;
    framedRef.current = frameKey;

    const highlight = ordered.find((s) => s.id === highlightStopId);
    if (highlight) {
      map.setView([highlight.lat, highlight.lng], Math.max(map.getZoom(), FOCUS_ZOOM));
    } else if (center) {
      map.setView([center.latitude, center.longitude], 14);
    } else {
      const points: L.LatLngTuple[] = [
        ...ordered.map((s): L.LatLngTuple => [s.lat, s.lng]),
        ...(start && hasCoords(start) ? [[start.lat, start.lng] as L.LatLngTuple] : []),
      ];
      if (points.length === 1) map.setView(points[0], FOCUS_ZOOM);
      else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: FOCUS_ZOOM });
    }
  }, [placed, highlightStopId, showRoute, routePolyline, start, center, interactive]);

  // Live position (blue dot).
  useEffect(() => {
    const map = mapRef.current;
    if (!showUserLocation || !map || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const ll: L.LatLngTuple = [coords.latitude, coords.longitude];
        if (userRef.current) userRef.current.setLatLng(ll);
        else
          userRef.current = L.circleMarker(ll, {
            radius: 7,
            color: colors.white,
            weight: 2,
            fillColor: colors.info,
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      userRef.current?.remove();
      userRef.current = null;
    };
  }, [showUserLocation, interactive]);

  const recenterOnUser = () => {
    const pos = userRef.current?.getLatLng();
    if (pos) mapRef.current?.setView(pos, FOCUS_ZOOM);
  };

  return (
    <View style={[styles.container, style]}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: colors.surface }} />
      {showUserLocation && (
        <Pressable onPress={recenterOnUser} style={styles.recenterBtn} hitSlop={8}>
          <Ionicons name="locate" size={20} color={colors.primary} />
        </Pressable>
      )}
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
  recenterBtn: {
    position: 'absolute',
    right: 12,
    bottom: 28, // above the attribution line
    zIndex: 1000, // Leaflet panes go up to z-index 700
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.mid,
  },
});
