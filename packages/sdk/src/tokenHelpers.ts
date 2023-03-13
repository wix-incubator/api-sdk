import { AccessToken } from './auth/OAuthStrategy';

export function getCurrentDate() {
  return Math.floor(Date.now() / 1000);
}

export function isTokenExpired(token: AccessToken): boolean {
  const currentDate = getCurrentDate();
  return token.expiresAt < currentDate;
}

export function createAccessToken(
  accessToken: string,
  expiresIn: number,
): AccessToken {
  const now = getCurrentDate();
  return { value: accessToken, expiresAt: Number(expiresIn) + now };
}
