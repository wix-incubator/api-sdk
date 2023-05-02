import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';
import { VALID_TOKEN } from './fixtures/constants';
import { OAuthStrategy } from '../auth/oauth2/OAuthStrategy';
import { authentication } from '@wix/identity';
import * as pkceChallenge from 'pkce-challenge';

describe('direct login', () => {
  const getClient = () =>
    createClient({
      modules: { cart },
      auth: OAuthStrategy({ clientId: 'some-clientId' }),
    });

  it('should get recaptcha script url', () => {
    const client = getClient();
    const scriptUrl = client.auth.getRecaptchaScriptUrl();
    expect(scriptUrl).toEqual(
      'https://www.google.com/recaptcha/enterprise.js?render=6LdoPaUfAAAAAJphvHoUoOob7mx0KDlXyXlgrx5v',
    );
  });

  it('should allow register', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.SUCCESS,
            sessionToken: 'some-token',
          }),
      }),
    );

    const client = getClient();

    // @ts-expect-error
    const { stateKind, data } = await client.auth.register({
      email: 'my@email.com',
      password: '123456',
      profile: { firstName: 'John' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          loginId: { email: 'my@email.com' },
          password: '123456',
          profile: { firstName: 'John' },
        }),
      }),
    );
    expect(stateKind).toEqual('success');
    expect(data).toEqual({ sessionToken: 'some-token' });
  });

  it('should allow register with owner approval', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.REQUIRE_OWNER_APPROVAL,
          }),
      }),
    );

    const client = getClient();

    const { stateKind } = await client.auth.register({
      email: 'my@email.com',
      password: '123456',
      profile: { firstName: 'John' },
    });

    expect(stateKind).toEqual('ownerApprovalRequired');
  });

  it('should allow register with email verification', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.REQUIRE_EMAIL_VERIFICATION,
            stateToken: 'stateToken',
          }),
      }),
    );

    const client = getClient();

    // @ts-expect-error
    const { stateKind, data } = await client.auth.register({
      email: 'my@email.com',
      password: '123456',
      profile: { firstName: 'John' },
    });

    expect(stateKind).toEqual('emailVerificationRequired');
    expect(data).toEqual({ stateToken: 'stateToken' });
  });

  // todo: add error tests

  it('should allow login', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.SUCCESS,
            sessionToken: 'some-token',
          }),
      }),
    );

    const client = getClient();

    // @ts-expect-error
    const { stateKind, data } = await client.auth.login({
      email: 'my@email.com',
      password: '123456',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          loginId: { email: 'my@email.com' },
          password: '123456',
        }),
      }),
    );
    expect(stateKind).toEqual('success');
    expect(data).toEqual({ sessionToken: 'some-token' });
  });

  it('should return tokens from session token', async () => {
    const sessionToken = 'some-session-token';
    const codeChallenge = 'some-code-challenge';
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            redirectSession: {
              fullUrl: 'https://redirect.com',
            },
            accessToken: VALID_TOKEN,
            refreshToken: 'some-refreshToken',
            expiresIn: 3600,
          }),
      }),
    );

    jest.spyOn(pkceChallenge, 'default').mockReturnValue({
      code_challenge: 'some-code-challenge',
      code_verifier: 'some-code-verifier',
    });

    const client = getClient();

    const tokensPromise = client.auth.complete(sessionToken);

    window.postMessage(
      {
        state: codeChallenge,
        code: 'some-code',
      },
      '*',
    );
    const tokens = await tokensPromise;
    expect(tokens).toEqual({
      accessToken: {
        value: VALID_TOKEN,
        expiresAt: expect.any(Number),
      },
      refreshToken: { value: 'some-refreshToken' },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          auth: {
            authRequest: {
              clientId: 'some-clientId',
              codeChallenge,
              codeChallengeMethod: 'S256',
              responseMode: 'web_message',
              responseType: 'code',
              scope: 'offline_access',
              state: codeChallenge,
              sessionToken,
            },
          },
        }),
      }),
    );
  });

  it('should send reset password mail', async () => {
    const client = getClient();

    await client.auth.sendResetPasswordMail('email@gmail.com');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          email: 'email@gmail.com',
        }),
      }),
    );
  });

  it('should proceed after email verification', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.REQUIRE_EMAIL_VERIFICATION,
            stateToken: 'stateToken',
          }),
      }),
    );

    const client = getClient();

    await client.auth.register({
      email: 'my@email.com',
      password: '123456',
    });

    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            state: authentication.StateType.SUCCESS,
            sessionToken: 'some-token',
          }),
      }),
    );

    await client.auth.proceed({ code: '112233' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          code: '112233',
          stateToken: 'stateToken',
        }),
      }),
    );
  });
});
