import { createClient } from '../../wixClient';
import { redirects } from '@wix/redirects';
import { createAccessToken, isTokenExpired } from '../../tokenHelpers';
import pkceChallenge from 'pkce-challenge';
import { oauth, authentication, recovery, verification } from '@wix/identity';
import { API_URL } from '../../common';
import {
  AccessToken,
  CalculateNextState,
  IOAuthStrategy,
  LoginParams,
  OauthData,
  OauthPKCE,
  ProcessableState,
  RefreshToken,
  RegisterParams,
  StateMachine,
  Tokens,
} from './types';
import { addPostMessageListener, loadFrame } from '../../iframeUtils';

const moduleWithTokens = { redirects, authentication, recovery, verification };
const WIX_RECAPTCHA_ID = '6LdoPaUfAAAAAJphvHoUoOob7mx0KDlXyXlgrx5v';

export function OAuthStrategy(config: {
  clientId: string;
  tokens?: Tokens;
}): IOAuthStrategy {
  const _tokens: Tokens = config.tokens || {
    accessToken: { value: '', expiresAt: 0 },
    refreshToken: { value: '' },
  };

  const setTokens = (tokens: Tokens): void => {
    _tokens.accessToken = tokens.accessToken;
    _tokens.refreshToken = tokens.refreshToken;
  };
  let state: StateMachine = { stateKind: 'initial' };
  let isLoggedInFlag = false;

  const getAuthHeaders = async () => {
    if (!_tokens.accessToken?.value || isTokenExpired(_tokens.accessToken)) {
      const tokens = await generateVisitorTokens({
        refreshToken: _tokens.refreshToken,
      });
      setTokens(tokens);
    }
    return Promise.resolve({
      headers: { Authorization: _tokens.accessToken.value },
    });
  };

  const wixClientWithTokens = createClient({
    modules: moduleWithTokens,
    auth: { getAuthHeaders },
  });

  const generateVisitorTokens = async (
    tokens?: Partial<Tokens>,
  ): Promise<Tokens> => {
    if (
      tokens?.accessToken?.value &&
      tokens?.refreshToken?.value &&
      !isTokenExpired(tokens.accessToken)
    ) {
      await fetchIsLoggedIn(tokens.accessToken);
      return Promise.resolve(tokens) as Promise<Tokens>;
    }

    if (tokens?.refreshToken?.value) {
      return renewToken(tokens.refreshToken);
    }

    const tokensResponse = await fetchTokens({
      clientId: config.clientId,
      grantType: 'anonymous',
    });

    return {
      accessToken: createAccessToken(
        tokensResponse.accessToken!,
        tokensResponse.expiresIn!,
      ),
      refreshToken: { value: tokensResponse.refreshToken! },
    };
  };

  const renewToken = async (refreshToken: RefreshToken): Promise<Tokens> => {
    const tokensResponse = await fetchTokens({
      refreshToken: refreshToken.value,
      grantType: 'refresh_token',
    });

    const accessToken = createAccessToken(
      tokensResponse.accessToken!,
      tokensResponse.expiresIn!,
    );

    await fetchIsLoggedIn(accessToken);

    return {
      accessToken: createAccessToken(
        tokensResponse.accessToken!,
        tokensResponse.expiresIn!,
      ),
      refreshToken,
    };
  };

  const generatePKCE = (): OauthPKCE => {
    const pkceState = pkceChallenge();
    return {
      codeChallenge: pkceState.code_challenge,
      codeVerifier: pkceState.code_verifier,
      state: pkceChallenge().code_challenge,
    };
  };

  const generateOAuthData = (
    redirectUri: string,
    originalUri?: string,
  ): OauthData => {
    const state = { redirectUri };
    const pkceState = generatePKCE();
    return {
      ...state,
      originalUri: originalUri ?? '',
      codeChallenge: pkceState.codeChallenge,
      codeVerifier: pkceState.codeVerifier,
      state: pkceChallenge().code_challenge,
    };
  };

  const getAuthorizationUrlWithOptions = async (
    oauthData: Partial<OauthData>,
    responseMode: 'fragment' | 'web_message',
    sessionToken?: string,
  ) => {
    const { redirectSession } =
      await wixClientWithTokens.redirects.createRedirectSession({
        auth: {
          authRequest: {
            redirectUri: oauthData.redirectUri,
            ...(oauthData.redirectUri && {
              redirectUri: oauthData.redirectUri,
            }),
            clientId: config.clientId,
            codeChallenge: oauthData.codeChallenge,
            codeChallengeMethod: 'S256',
            responseMode,
            responseType: 'code',
            scope: 'offline_access',
            state: oauthData.state,
            ...(sessionToken && { sessionToken }),
          },
        },
      });
    return { authUrl: redirectSession!.fullUrl! };
  };

  const getAuthUrl = async (oauthData: OauthData) => {
    return getAuthorizationUrlWithOptions(oauthData, 'fragment');
  };

  const parseFromUrl = () => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const code = params.get('code')!;
    const state = params.get('state')!;
    return { code, state };
  };

  const getMemberTokens = async (
    code: string,
    state: string,
    oauthData: Partial<OauthData>,
  ) => {
    if (!code || !state) {
      throw new Error('Missing code or state');
    } else if (state !== oauthData.state) {
      throw new Error('Invalid state');
    }

    const tokensResponse = await fetchTokens({
      clientId: config.clientId,
      grantType: 'authorization_code',
      ...(oauthData.redirectUri && { redirectUri: oauthData.redirectUri }),
      code,
      codeVerifier: oauthData.codeVerifier,
    });

    const tokens = {
      accessToken: createAccessToken(
        tokensResponse.accessToken!,
        tokensResponse.expiresIn!,
      ),
      refreshToken: { value: tokensResponse.refreshToken! },
    };
    isLoggedInFlag = true;

    return tokens;
  };

  const logout = async (
    originalUrl: string,
  ): Promise<{ logoutUrl: string }> => {
    const { redirectSession } =
      await wixClientWithTokens.redirects.createRedirectSession({
        logout: { clientId: config.clientId },
        callbacks: {
          postFlowUrl: originalUrl,
        },
      });
    _tokens.accessToken = { value: '', expiresAt: 0 };
    _tokens.refreshToken = { value: '' };
    isLoggedInFlag = false;
    return { logoutUrl: redirectSession!.fullUrl! };
  };

  const handleState = (
    response: authentication.StateMachineResponse,
  ): StateMachine => {
    if (response.state === authentication.StateType.SUCCESS) {
      return {
        stateKind: 'success',
        data: { sessionToken: response.sessionToken! },
      };
    } else if (
      response.state === authentication.StateType.REQUIRE_OWNER_APPROVAL
    ) {
      return {
        stateKind: 'ownerApprovalRequired',
      };
    } else if (
      response.state === authentication.StateType.REQUIRE_EMAIL_VERIFICATION
    ) {
      state = {
        stateKind: 'emailVerificationRequired',
        data: { stateToken: response.stateToken! },
      };
      return state;
    }
    return { stateKind: 'failure', error: 'Unknown state' };
  };

  const register = async (params: RegisterParams): Promise<StateMachine> => {
    try {
      const res = await wixClientWithTokens.authentication.registerV2(
        {
          email: params.email,
        },
        {
          password: params.password,
          profile: params.profile,
          ...(params.captchaTokens && {
            captchaTokens: [
              {
                Recaptcha: params.captchaTokens?.recaptcha,
                InvisibleRecaptcha: params.captchaTokens?.invisibleRecaptcha,
              },
            ],
          }),
        },
      );
      return handleState(res);
    } catch (e: any) {
      const emailValidation = e.details.validationError?.fieldViolations?.find(
        (v: any) => v.data.type === 'EMAIL',
      );
      if (emailValidation) {
        return {
          stateKind: 'failure',
          error: emailValidation.description,
          errorCode: 'invalidEmail',
        };
      }
      if (e.details.applicationError?.code === '-19971') {
        return {
          stateKind: 'failure',
          error: e.message,
          errorCode: 'missingCaptchaToken',
        };
      }
      if (e.details.applicationError?.code === '-19995') {
        return {
          stateKind: 'failure',
          error: e.message,
          errorCode: 'emailAlreadyExists',
        };
      }
      if (e.details.applicationError?.code === '-19970') {
        return {
          stateKind: 'failure',
          error: e.message,
          errorCode: 'invalidCaptchaToken',
        };
      }
      return { stateKind: 'failure', error: e.message };
    }
  };

  const login = async (params: LoginParams): Promise<StateMachine> => {
    try {
      const res = await wixClientWithTokens.authentication.loginV2(
        {
          email: params.email,
        },
        { password: params.password },
      );
      return handleState(res);
    } catch (e: any) {
      return {
        stateKind: 'failure',
        error: e.message,
        errorCode:
          e.details.applicationError.code === '-19976'
            ? 'invalidPassword'
            : e.details.applicationError.code === '-19973'
            ? 'resetPassword'
            : 'invalidEmail',
      };
    }
  };

  const proceed = async <T extends ProcessableState>(
    nextInputs: CalculateNextState<T>,
  ): Promise<StateMachine> => {
    if (state.stateKind === 'emailVerificationRequired') {
      const res =
        await wixClientWithTokens.verification.verifyDuringAuthentication(
          nextInputs.code,
          { stateToken: state.data.stateToken },
        );
      return handleState(res);
    }
    return { stateKind: 'failure', error: 'Unknown state' };
  };

  const complete = async (sessionToken: string) => {
    const oauthPKCE = generatePKCE();
    const { authUrl } = await getAuthorizationUrlWithOptions(
      oauthPKCE,
      'web_message',
      sessionToken,
    );
    const iframePromise = addPostMessageListener(oauthPKCE.state);
    const iframeEl = loadFrame(authUrl!);
    return iframePromise
      .then(async (res: any) => {
        await new Promise((r) => setTimeout(r, 2000));
        return getMemberTokens(res.code, res.state, oauthPKCE);
      })
      .finally(() => {
        if (document.body.contains(iframeEl)) {
          iframeEl.parentElement?.removeChild(iframeEl);
        }
      });
  };

  const sendResetPasswordMail = async (email: string) => {
    await wixClientWithTokens.recovery.sendRecoveryEmail(email);
  };

  const getRecaptchaScriptUrl = () => {
    return `https://www.google.com/recaptcha/enterprise.js?render=${WIX_RECAPTCHA_ID}`;
  };

  const getRecaptchaToken = async (): Promise<string> => {
    return new Promise((resolve) => {
      grecaptcha.enterprise.ready(() => {
        grecaptcha.enterprise
          .execute(WIX_RECAPTCHA_ID, { action: 'submit' })
          .then((token) => {
            resolve(token);
          });
      });
    });
  };

  const fetchIsLoggedIn = async (accessToken: AccessToken) => {
    try {
      const res = await fetch(`https://${API_URL}/members/v1/members/my`, {
        headers: { Authorization: accessToken.value },
      });
      await res.json();
      isLoggedInFlag = true;
    } catch (e) {
      isLoggedInFlag = false;
    }
  };

  const isLoggedIn = () => {
    return isLoggedInFlag;
  };

  return {
    generateVisitorTokens,
    renewToken,
    parseFromUrl,
    getAuthUrl,
    getMemberTokens,
    generateOAuthData,
    getAuthHeaders,
    setTokens,
    getTokens: () => _tokens,
    isLoggedIn,
    logout,
    register,
    proceed,
    login,
    complete,
    sendResetPasswordMail,
    getRecaptchaScriptUrl,
    getRecaptchaToken,
  };
}

const fetchTokens = async (payload: any): Promise<oauth.TokenResponse> => {
  const res = await fetch(`https://${API_URL}/oauth2/token`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};
