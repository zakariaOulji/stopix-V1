export { authMock } from './auth.mock';
export { tourneesMock, activeTourneeId } from './tournees.mock';
export { stopsMock } from './stops.mock';
export { statsMock } from './stats.mock';
export { notificationsMock } from './notifications.mock';

/** Simulate a network round-trip for mocked actions. */
export const fakeDelay = (ms = 1000) => new Promise<void>((resolve) => setTimeout(resolve, ms));
