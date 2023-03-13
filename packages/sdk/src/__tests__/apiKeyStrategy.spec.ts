import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';
import { ApiKeyStrategy } from '../auth/ApiKeyAuthStrategy';

describe('APIKeyStrategy', () => {
  beforeEach(() => {
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
  });

  it('site level - should enrich calls with relevant headers', async () => {
    const siteLevelApiKeyConfig = {
      siteId: 'some-site-id',
      apiKey: 'some-api-key',
    };

    const client = createClient({
      modules: { cart },
      auth: ApiKeyStrategy(siteLevelApiKeyConfig),
    });

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: siteLevelApiKeyConfig.apiKey,
          'wix-site-id': siteLevelApiKeyConfig.siteId,
        },
      }),
    );
  });

  it('account level - should enrich calls with relevant headers', async () => {
    const accountLevelApiKeyConfig = {
      accountId: 'some-account-id',
      apiKey: 'some-api-key',
    };

    const client = createClient({
      modules: { cart },
      auth: ApiKeyStrategy(accountLevelApiKeyConfig),
    });

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: accountLevelApiKeyConfig.apiKey,
          'wix-account-id': accountLevelApiKeyConfig.accountId,
        },
      }),
    );
  });

  it('both levels - should enrich calls with relevant headers', async () => {
    const bothLevelsApiKeyConfig = {
      accountId: 'some-account-id',
      siteId: 'some-site-id',
      apiKey: 'some-api-key',
    };

    const client = createClient({
      modules: { cart },
      auth: ApiKeyStrategy(bothLevelsApiKeyConfig),
    });

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: bothLevelsApiKeyConfig.apiKey,
          'wix-account-id': bothLevelsApiKeyConfig.accountId,
          'wix-site-id': bothLevelsApiKeyConfig.siteId,
        },
      }),
    );
  });

  it('should allow updating account and site Ids', async () => {
    const baseConfig = {
      apiKey: 'some-api-key',
    };
    const siteId = 'some-site-id';
    const accountId = 'some-account-id';

    const auth = ApiKeyStrategy(baseConfig);
    const client = createClient({
      modules: { cart },
      auth,
    });
    auth.setSiteId(siteId);

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: baseConfig.apiKey,
          'wix-site-id': siteId,
        },
      }),
    );

    auth.setAccountId(accountId);

    await client.cart.createCart({});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: baseConfig.apiKey,
          'wix-site-id': siteId,
          'wix-account-id': accountId,
        },
      }),
    );
  });
});
