import { haversine, optimizeRoute } from './optimize';

describe('haversine', () => {
  it('is ~0 for the same point', () => {
    expect(haversine({ lat: 48.85, lng: 2.35 }, { lat: 48.85, lng: 2.35 })).toBeCloseTo(0, 5);
  });
  it('is positive for distinct points', () => {
    expect(haversine({ lat: 48.85, lng: 2.35 }, { lat: 48.86, lng: 2.36 })).toBeGreaterThan(0);
  });
});

describe('optimizeRoute', () => {
  it('returns every index exactly once', () => {
    const pts = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const { order } = optimizeRoute(pts);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('never worsens the route (improvement >= 0)', () => {
    const zigzag = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 5 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 4 },
      { lat: 0, lng: 2 },
    ];
    const { improvement } = optimizeRoute(zigzag);
    expect(improvement).toBeGreaterThanOrEqual(0);
  });

  it('handles empty and single-point inputs', () => {
    expect(optimizeRoute([]).order).toEqual([]);
    expect(optimizeRoute([{ lat: 1, lng: 1 }]).order).toEqual([0]);
  });
});
