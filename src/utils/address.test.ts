import { isLocated, postalCodeFrom } from './address';

describe('isLocated', () => {
  it('accepts real coordinates', () => expect(isLocated({ lat: 50.85, lng: 4.35 })).toBe(true));
  it('rejects missing or 0,0 placeholder coordinates', () => {
    expect(isLocated({})).toBe(false);
    expect(isLocated({ lat: 0, lng: 0 })).toBe(false);
    expect(isLocated({ lat: 50.85, lng: undefined })).toBe(false);
    expect(isLocated({ lat: NaN, lng: 4.35 })).toBe(false);
  });
});

describe('postalCodeFrom', () => {
  it('reads Belgian (4) and French (5) postal codes', () => {
    expect(postalCodeFrom('Rue Neuve 12, 1000 Bruxelles')).toBe('1000');
    expect(postalCodeFrom('12 Rue de Rivoli, 75004 Paris')).toBe('75004');
  });
  it('returns an empty string when there is none', () => expect(postalCodeFrom('Rue Neuve')).toBe(''));
});
