/**
 * Dark "Field OS" Google Maps style (for react-native-maps `customMapStyle`).
 * Tuned to match the app background (#0A0F1E) with muted labels + green-ish water.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0F1E' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A93A8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F1E' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1C2333' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8A93A8' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#C7CEDC' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242D42' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1C2333' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7488' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2A3450' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33405E' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1830' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A4560' }] },
] as const;
