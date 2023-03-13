import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';
import { OAuthStrategy } from '../auth/OAuthStrategy';
import { VALID_TOKEN } from './fixtures/constants';
import { getCurrentDate } from '../tokenHelpers';

describe('OAuthStrategy', () => {
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
          }),
      }),
    );
  });

  describe('generateVisitorTokens', () => {
    it('should generate tokens when no tokens exists', async () => {
      const client = createClient({
        modules: { cart },
        auth: OAuthStrategy({ clientId: 'some-clientId' }),
      });
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
      const client = createClient({
        modules: { cart },
        auth: OAuthStrategy({ clientId: 'some-clientId' }),
      });

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
            grantType: 'refresh_token',
            refreshToken: 'something',
          }),
        }),
      );
    });

    it('should return tokens when access token valid', async () => {
      const client = createClient({
        modules: { cart },
        auth: OAuthStrategy({ clientId: 'some-clientId' }),
      });
      const refreshToken = { value: 'something' };
      const tokens = await client.auth.generateVisitorTokens({
        refreshToken,
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: getCurrentDate() + 1000,
        },
      });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(tokens).toEqual({
        accessToken: {
          value: VALID_TOKEN,
          expiresAt: expect.any(Number),
        },
        refreshToken,
      });
    });

    it('should generate access token based on refresh token', async () => {
      const client = createClient({
        modules: { cart },
        auth: OAuthStrategy({ clientId: 'some-clientId' }),
      });
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
            grantType: 'refresh_token',
            refreshToken: refreshToken.value,
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
    const client = createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });
    const tokens = await client.auth.renewToken({ value: 'some-refreshToken' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          grantType: 'refresh_token',
          refreshToken: 'some-refreshToken',
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

    const client = createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });

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
});
