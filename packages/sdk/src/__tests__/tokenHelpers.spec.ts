import { VALID_TOKEN } from './fixtures/constants';
import { getCurrentDate, isTokenExpired } from '../tokenHelpers';

describe('token helpers', () => {
  it('should check if token is expired', () => {
    const isExpired = isTokenExpired({
      value: VALID_TOKEN,
      expiresAt: getCurrentDate() - 10,
    });
    expect(isExpired).toBe(true);
  });

  it('should check if token is valid', () => {
    const isExpired = isTokenExpired({
      value: VALID_TOKEN,
      expiresAt: getCurrentDate() + 10,
    });
    expect(isExpired).toBe(false);
  });
});
