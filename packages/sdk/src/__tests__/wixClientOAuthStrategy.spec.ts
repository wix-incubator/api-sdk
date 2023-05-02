import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';
import { VALID_TOKEN } from './fixtures/constants';
import { getCurrentDate } from '../tokenHelpers';
import { OAuthStrategy } from '../auth/oauth2/OAuthStrategy';
import { API_URL } from '../common';

describe('OAuthStrategy', () => {
  const getClient = () =>
    createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });

  beforeEach(() => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: VALID_TOKEN,
            refreshToken: 'some-refreshToken',
            expiresIn: 3600,
            redirectSession: {
              fullUrl: 'https://redirect.com',
            },
          }),
      }),
    );
  });

  describe('generateVisitorTokens', () => {
    it('should generate tokens when no tokens exists', async () => {
      const client = getClient();
      const tokens = await client.auth.generateVisitorTokens();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            clientId: 'some-clientId',
            grantType: 'anonymous',
          }),
        }),
      );
      expect(tokens).toEqual({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: expect.any(Number),
        },
        refreshToken: { value: 'some-refreshToken' },
      });
    });

    it('should generate tokens on the fly', async () => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: '96a61a4b-6b61-47d1-a039-0213a8230ccd',
                lineItems: [],
              },
              accessToken: VALID_TOKEN,
              refreshToken: 'some-refreshToken',
            }),
        }),
      );
      const client = getClient();

      client.auth.setTokens({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() - 1000,
        },
        refreshToken: { value: 'something' },
      });

      await client.cart.createCart({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            refreshToken: 'something',
            grantType: 'refresh_token',
          }),
        }),
      );
    });

    it('should return tokens when access token valid', async () => {
      const client = getClient();
      const refreshToken = { value: 'something' };
      const tokens = await client.auth.generateVisitorTokens({
        refreshToken,
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() + 1000,
        },
      });

      expect(tokens).toEqual({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: expect.any(Number),
        },
        refreshToken,
      });
    });

    it('should generate access token based on refresh token', async () => {
      const client = getClient();
      const refreshToken = { value: 'some-refreshToken' };
      const tokens = await client.auth.generateVisitorTokens({
        refreshToken,
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() - 1000,
        },
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            refreshToken: refreshToken.value,
            grantType: 'refresh_token',
          }),
        }),
      );
      expect(tokens).toEqual({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: expect.any(Number),
        },
        refreshToken,
      });
    });
  });

  it('should renew token', async () => {
    const client = getClient();
    const tokens = await client.auth.renewToken({ value: 'some-refreshToken' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          refreshToken: 'some-refreshToken',
          grantType: 'refresh_token',
        }),
      }),
    );
    expect(tokens).toEqual({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: expect.any(Number),
      },
      refreshToken: { value: 'some-refreshToken' },
    });
  });

  it('should set tokens', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            cart: {
              id: '96a61a4b-6b61-47d1-a039-0213a8230ccd',
              lineItems: [],
            },
          }),
      }),
    );

    const client = getClient();

    client.auth.setTokens({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: getCurrentDate() + 1000,
      },
      refreshToken: { value: 'something' },
    });

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: VALID_TOKEN }),
      }),
    );

    expect(client.auth.getTokens()).toEqual({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: expect.any(Number),
      },
      refreshToken: { value: 'something' },
    });
  });

  it('should get tokens on init', async () => {
    const client = createClient({
      modules: { cart },
      auth: OAuthStrategy({
        clientId: 'some-clientId',
        tokens: {
          accessToken: {
            value: VALID_TOKEN,
            expiresAt: getCurrentDate() + 1000,
          },
          refreshToken: { value: 'something' },
        },
      }),
    });

    expect(client.auth.getTokens()).toEqual({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: expect.any(Number),
      },
      refreshToken: { value: 'something' },
    });
  });

  it('should generate new oauth state', async () => {
    const client = getClient();
    const redirectUri = 'https://example.com/callback';
    const originalUri = 'https://example.com';

    const oauthState = client.auth.generateOAuthData(redirectUri, originalUri);

    expect(oauthState).toEqual({
      originalUri,
      redirectUri,
      codeChallenge: expect.any(String),
      codeVerifier: expect.any(String),
      state: expect.any(String),
    });
  });

  it('should redirect to authorize endpoint on signin', async () => {
    const client = getClient();
    const redirectUri = 'https://example.com';
    client.auth.setTokens({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: getCurrentDate() + 1000,
      },
      refreshToken: { value: 'something' },
    });
    const oauthState = client.auth.generateOAuthData(redirectUri);
    const { authUrl } = await client.auth.getAuthUrl(oauthState);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          auth: {
            authRequest: {
              redirectUri,
              clientId: 'some-clientId',
              codeChallenge: oauthState.codeChallenge,
              codeChallengeMethod: 'S256',
              responseMode: 'fragment',
              responseType: 'code',
              scope: 'offline_access',
              state: oauthState.state,
            },
          },
        }),
        headers: expect.objectContaining({
          Authorization: VALID_TOKEN,
        }),
      }),
    );

    expect(authUrl).toBe('https://redirect.com');
  });

  describe('member tokens', () => {
    it('should get member tokens', async () => {
      const client = getClient();
      const redirectUri = 'https://example.com';
      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something&state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();
      await client.auth.getMemberTokens(code, state, oauthState);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            clientId: 'some-clientId',
            grantType: 'authorization_code',
            redirectUri,
            code: 'something',
            codeVerifier: oauthState.codeVerifier,
          }),
        }),
      );
    });

    it('should throw when state is not matched', async () => {
      const client = getClient();
      const redirectUri = 'https://example.com';
      window.location.hash = `#code=something&state=something`;
      const { state, code } = client.auth.parseFromUrl();

      const oauthState = client.auth.generateOAuthData(redirectUri);
      expect(() =>
        client.auth.getMemberTokens(code, state, oauthState),
      ).rejects.toThrow();
    });

    it('should throw when code is missing', async () => {
      const client = getClient();
      const redirectUri = 'https://example.com';

      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();

      expect(() =>
        client.auth.getMemberTokens(code, state, oauthState),
      ).rejects.toThrow();
    });

    it('should throw when state is missing', async () => {
      const client = getClient();
      const redirectUri = 'https://example.com';

      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something`;
      const { state, code } = client.auth.parseFromUrl();

      expect(() =>
        client.auth.getMemberTokens(code, state, oauthState),
      ).rejects.toThrow();
    });

    it('should logout', async () => {
      const client = getClient();
      const originalUrl = 'https://example.com';
      client.auth.setTokens({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() + 1000,
        },
        refreshToken: { value: 'refresh' },
      });
      await client.auth.logout(originalUrl);

      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            logout: { clientId: 'some-clientId' },
            callbacks: {
              postFlowUrl: originalUrl,
            },
          }),
        }),
      );
    });
  });

  describe('isLoggedIn', () => {
    it('should set when have values', async () => {
      const client = getClient();
      const refreshToken = { value: 'something' };

      await client.auth.generateVisitorTokens({
        refreshToken,
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() + 1000,
        },
      });
      expect(global.fetch).toHaveBeenCalledWith(
        `https://${API_URL}/members/v1/members/my`,
        { headers: { Authorization: VALID_TOKEN } },
      );
    });

    it('should set when have refresh token', async () => {
      const client = getClient();
      const refreshToken = { value: 'something' };

      await client.auth.generateVisitorTokens({
        refreshToken,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        `https://${API_URL}/members/v1/members/my`,
        { headers: { Authorization: VALID_TOKEN } },
      );
    });

    it('should return true after login', async () => {
      const client = getClient();

      const redirectUri = 'https://example.com';
      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something&state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();
      await client.auth.getMemberTokens(code, state, oauthState);

      expect(client.auth.isLoggedIn()).toBe(true);
    });

    it('should return true after logout', async () => {
      const client = getClient();

      const redirectUri = 'https://example.com';
      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something&state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();
      await client.auth.getMemberTokens(code, state, oauthState);
      await client.auth.logout('');
      expect(client.auth.isLoggedIn()).toBe(false);
    });
  });
});
