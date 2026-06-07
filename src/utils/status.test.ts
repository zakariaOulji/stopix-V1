import {
  stopStatusMeta,
  tourneeStatusMeta,
  vehicleMeta,
  failureReasonMeta,
} from './status';
import type { StopStatus, TourneeStatus, VehicleType, FailureReason } from '@/types';

describe('status meta maps', () => {
  it('covers every stop status', () => {
    (['pending', 'delivered', 'failed', 'skipped'] as StopStatus[]).forEach((s) => {
      expect(stopStatusMeta[s]).toBeDefined();
      expect(stopStatusMeta[s].label).toBeTruthy();
      expect(stopStatusMeta[s].color).toMatch(/^#|rgba/);
    });
  });

  it('covers every tournee status', () => {
    (['planned', 'active', 'completed'] as TourneeStatus[]).forEach((s) => {
      expect(tourneeStatusMeta[s].label).toBeTruthy();
    });
  });

  it('covers every vehicle type', () => {
    (['velo', 'moto', 'voiture', 'camionnette'] as VehicleType[]).forEach((v) => {
      expect(vehicleMeta[v].label).toBeTruthy();
      expect(vehicleMeta[v].icon).toBeTruthy();
    });
  });

  it('covers every failure reason', () => {
    (['absent', 'refus', 'adresse_invalide', 'autre'] as FailureReason[]).forEach((r) => {
      expect(failureReasonMeta[r].label).toBeTruthy();
    });
  });
});
