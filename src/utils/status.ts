import { colors } from '@/theme';
import type {
  StopStatus,
  TourneeStatus,
  VehicleType,
  FailureReason,
  EmploymentType,
} from '@/types';
import type { BadgeVariant } from '@/components/Badge';

export const stopStatusMeta: Record<
  StopStatus,
  { label: string; color: string; badge: BadgeVariant; icon: string }
> = {
  pending: { label: 'En attente', color: colors.muted, badge: 'neutral', icon: 'ellipse-outline' },
  delivered: { label: 'Livré', color: colors.primary, badge: 'success', icon: 'checkmark-circle' },
  failed: { label: 'Échec', color: colors.danger, badge: 'danger', icon: 'close-circle' },
  skipped: { label: 'Reporté', color: colors.warning, badge: 'warning', icon: 'arrow-undo-circle' },
};

export const tourneeStatusMeta: Record<
  TourneeStatus,
  { label: string; badge: BadgeVariant }
> = {
  planned: { label: 'Planifiée', badge: 'info' },
  active: { label: 'En cours', badge: 'success' },
  completed: { label: 'Terminée', badge: 'neutral' },
};

export const vehicleMeta: Record<VehicleType, { label: string; icon: string }> = {
  velo: { label: 'Vélo', icon: 'bicycle' },
  moto: { label: 'Moto', icon: 'bicycle-sharp' },
  voiture: { label: 'Voiture', icon: 'car-sport' },
  camionnette: { label: 'Camionnette', icon: 'bus' },
};

export const employmentMeta: Record<EmploymentType, string> = {
  independant: 'Indépendant',
  salarie: 'Salarié',
};

export const failureReasonMeta: Record<FailureReason, { label: string; icon: string }> = {
  absent: { label: 'Destinataire absent', icon: 'person-remove' },
  refus: { label: 'Colis refusé', icon: 'hand-left' },
  adresse_invalide: { label: 'Adresse invalide', icon: 'location' },
  autre: { label: 'Autre raison', icon: 'ellipsis-horizontal-circle' },
};
