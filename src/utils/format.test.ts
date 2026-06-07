import { formatDuration, relativeDay, timeAgo } from './format';

describe('formatDuration', () => {
  it('formats durations under an hour', () => {
    expect(formatDuration(45)).toBe('45min');
  });
  it('formats hours and minutes with padding', () => {
    expect(formatDuration(312)).toBe('5h12');
    expect(formatDuration(65)).toBe('1h05');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-06-07T12:00:00Z');
  it('returns "à l\'instant" under a minute', () => {
    expect(timeAgo('2026-06-07T11:59:30Z', now)).toBe("à l'instant");
  });
  it('returns minutes', () => {
    expect(timeAgo('2026-06-07T11:30:00Z', now)).toBe('il y a 30 min');
  });
  it('returns hours', () => {
    expect(timeAgo('2026-06-07T09:00:00Z', now)).toBe('il y a 3 h');
  });
  it('returns days', () => {
    expect(timeAgo('2026-06-04T12:00:00Z', now)).toBe('il y a 3 j');
  });
});

describe('relativeDay', () => {
  // Times include T12:00:00 (no Z) so parsing is local and timezone-stable.
  const today = new Date('2026-06-07T12:00:00');
  it('labels today / yesterday / tomorrow', () => {
    expect(relativeDay('2026-06-07T12:00:00', today)).toBe("Aujourd'hui");
    expect(relativeDay('2026-06-06T12:00:00', today)).toBe('Hier');
    expect(relativeDay('2026-06-08T12:00:00', today)).toBe('Demain');
  });
});
