/**
 * STOPIX domain types. Shared by mocks, stores and components.
 */

export type VehicleType = 'velo' | 'moto' | 'voiture' | 'camionnette';
export type DriverRole = 'driver' | 'manager';
export type EmploymentType = 'independant' | 'salarie';

export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: DriverRole;
  vehicle: VehicleType;
  employment?: EmploymentType;
}

export type StopStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

export type FailureReason = 'absent' | 'refus' | 'adresse_invalide' | 'autre';

export interface Stop {
  id: string;
  tourneeId: string;
  order: number;
  status: StopStatus;
  recipient: string;
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  notes?: string;
  accessCode?: string;
  phone?: string;
  /** Number of standard parcels. */
  packages: number;
  /** Number of bulk ("vrac") items. */
  vrac?: number;
  /** Estimated time of arrival, e.g. "14:20". */
  eta?: string;
  /** Set when delivered/failed. */
  completedAt?: string;
  failureReason?: FailureReason;
}

export type TourneeStatus = 'planned' | 'active' | 'completed';

export interface Tournee {
  id: string;
  name: string;
  status: TourneeStatus;
  date: string; // ISO date
  stopsCount: number;
  deliveredCount: number;
  failedCount: number;
  distanceKm: number;
  estimatedDurationMin: number;
  startTime?: string;
  endTime?: string;
  /** Map region center for the route. */
  region: { latitude: number; longitude: number };
}

export interface Stats {
  deliveriesToday: number;
  successRate: number; // %
  distanceKm: number;
  durationMin: number;
  weeklyDeliveries: number[]; // Mon..Sun
  co2Saved: number; // kg
  totalDeliveries: number;
  totalDistanceKm: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  createdAt: string;
}
