import { getDefaultRouteForRole } from './context/AuthContext';

describe('getDefaultRouteForRole', () => {
  it('returns the teacher dashboard route', () => {
    expect(getDefaultRouteForRole('teacher')).toBe('/teacher');
  });

  it('returns the manager dashboard route', () => {
    expect(getDefaultRouteForRole('manager')).toBe('/manager');
  });

  it('returns the canteen dashboard route', () => {
    expect(getDefaultRouteForRole('canteen')).toBe('/canteen');
  });
});
