import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';
import { VALID_TOKEN } from './fixtures/constants';
import { getCurrentDate } from '../tokenHelpers';
import { OAuthStrategy } from '../auth/oauth2/OAuthStrategy';
import { TokenRole } from '../auth/oauth2/types';

const expectStringToMatchAllOfStrings = (strings: string[]) =>
  expect.stringMatching(RegExp(strings.map((str) => `(?=.*${str})`).join('')));

describe('OAuthStrategy', () => {
  const getClient = () =>
    createClient({
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });

  beforeEach(() => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: VALID_TOKEN,
            refresh_token: 'some-refreshToken',
            expires_in: 3600,
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
        refreshToken: { value: 'some-refreshToken', role: TokenRole.VISITOR },
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
      const client = createClient({
        modules: { cart },
        auth: OAuthStrategy({ clientId: 'some-clientId' }),
      });

      client.auth.setTokens({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() - 1000,
        },
        refreshToken: { value: 'something', role: TokenRole.VISITOR },
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
      const refreshToken = { value: 'something', role: TokenRole.MEMBER };
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
      const refreshToken = {
        value: 'some-refreshToken',
        role: TokenRole.VISITOR,
      };
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

    it('should send a bi header', async () => {
      const client = getClient();
      await client.auth.generateVisitorTokens();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-wix-bi-gateway': expectStringToMatchAllOfStrings([
              'environment=js-sdk',
              'package-name=@wix/api-client',
              'method-fqn=wix.identity.oauth2.v1.Oauth2Ng.Token',
              'entity=wix.identity.oauth.v1.refresh_token',
            ]),
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  it('should renew token', async () => {
    const client = getClient();
    const tokens = await client.auth.renewToken({
      value: 'some-refreshToken',
      role: TokenRole.VISITOR,
    });
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
      refreshToken: { value: 'some-refreshToken', role: TokenRole.VISITOR },
    });
  });

  it('should generate new token when refresh invalid', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 404,
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ access_token: VALID_TOKEN }),
        }),
      );
    const client = getClient();
    await client.auth.generateVisitorTokens({
      refreshToken: {
        value: 'some-refreshToken',
        role: TokenRole.VISITOR,
      },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          refreshToken: 'some-refreshToken',
          grantType: 'refresh_token',
        }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          clientId: 'some-clientId',
          grantType: 'anonymous',
        }),
      }),
    );
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

    const client = createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });

    client.auth.setTokens({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: getCurrentDate() + 1000,
      },
      refreshToken: { value: 'something', role: TokenRole.VISITOR },
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
      refreshToken: { value: 'something', role: TokenRole.VISITOR },
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
          refreshToken: { value: 'something', role: TokenRole.VISITOR },
        },
      }),
    });

    expect(client.auth.getTokens()).toEqual({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: expect.any(Number),
      },
      refreshToken: { value: 'something', role: TokenRole.VISITOR },
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
      refreshToken: { value: 'something', role: TokenRole.VISITOR },
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
            prompt: 'login',
          },
        }),
        headers: expect.objectContaining({
          Authorization: VALID_TOKEN,
        }),
      }),
    );

    expect(authUrl).toBe('https://redirect.com');
  });

  it('should redirect to authorize endpoint with silent login when prompt is none', async () => {
    const client = getClient();
    const redirectUri = 'https://example.com';
    client.auth.setTokens({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: getCurrentDate() + 1000,
      },
      refreshToken: { value: 'something', role: TokenRole.VISITOR },
    });
    const oauthState = client.auth.generateOAuthData(redirectUri);
    const { authUrl } = await client.auth.getAuthUrl(oauthState, {
      prompt: 'none',
    });

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
            prompt: 'none',
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

    it('should return error if exists', async () => {
      const client = getClient();
      window.location.hash = `#code=something&state=something&error=invalid_grant&error_description=Invalid+authorization+code`;
      const { errorDescription, error } = client.auth.parseFromUrl();
      expect(error).toBe('invalid_grant');
      expect(errorDescription).toBe('Invalid authorization code');
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
        refreshToken: { value: 'refresh', role: TokenRole.MEMBER },
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
    it('should return true after login', async () => {
      const client = getClient();

      const redirectUri = 'https://example.com';
      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something&state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();
      const tokens = await client.auth.getMemberTokens(code, state, oauthState);
      client.auth.setTokens(tokens);

      expect(client.auth.loggedIn()).toBe(true);
    });

    it('should return true after logout', async () => {
      const client = getClient();

      const redirectUri = 'https://example.com';
      const oauthState = client.auth.generateOAuthData(redirectUri);
      window.location.hash = `#code=something&state=${oauthState.state}`;
      const { state, code } = client.auth.parseFromUrl();
      await client.auth.getMemberTokens(code, state, oauthState);
      await client.auth.logout('');
      expect(client.auth.loggedIn()).toBe(false);
    });
  });
});
