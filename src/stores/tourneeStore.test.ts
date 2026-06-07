import { useTourneeStore } from './tourneeStore';

const ACTIVE = 'tournee-active';

function firstPending() {
  return useTourneeStore.getState().stops.find((s) => s.tourneeId === ACTIVE && s.status === 'pending')!;
}
function activeTournee() {
  return useTourneeStore.getState().tournees.find((t) => t.id === ACTIVE)!;
}

describe('tourneeStore', () => {
  beforeEach(() => {
    useTourneeStore.getState().resetMocks();
  });

  it('marks a stop as delivered and increments deliveredCount', () => {
    const before = activeTournee().deliveredCount;
    const stop = firstPending();

    useTourneeStore.getState().markDelivered(stop.id);

    const updated = useTourneeStore.getState().stops.find((s) => s.id === stop.id)!;
    expect(updated.status).toBe('delivered');
    expect(updated.completedAt).toBeTruthy();
    expect(activeTournee().deliveredCount).toBe(before + 1);
  });

  it('marks a stop as failed with a reason', () => {
    const before = activeTournee().failedCount;
    const stop = firstPending();

    useTourneeStore.getState().markFailed(stop.id, 'absent');

    const updated = useTourneeStore.getState().stops.find((s) => s.id === stop.id)!;
    expect(updated.status).toBe('failed');
    expect(updated.failureReason).toBe('absent');
    expect(activeTournee().failedCount).toBe(before + 1);
  });

  it('skips a stop without counting it as delivered or failed', () => {
    const t0 = activeTournee();
    const stop = firstPending();

    useTourneeStore.getState().skipStop(stop.id);

    const updated = useTourneeStore.getState().stops.find((s) => s.id === stop.id)!;
    expect(updated.status).toBe('skipped');
    expect(activeTournee().deliveredCount).toBe(t0.deliveredCount);
    expect(activeTournee().failedCount).toBe(t0.failedCount);
  });

  it('resets to the initial mock state', () => {
    const stop = firstPending();
    useTourneeStore.getState().markDelivered(stop.id);
    useTourneeStore.getState().resetMocks();
    const reset = useTourneeStore.getState().stops.find((s) => s.id === stop.id)!;
    expect(reset.status).toBe('pending');
  });
});
