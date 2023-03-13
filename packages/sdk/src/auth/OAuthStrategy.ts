import { createClient } from '../wixClient';
import { oauth } from '@wix/identity';
import { createAccessToken, isTokenExpired } from '../tokenHelpers';

export interface Tokens {
  accessToken: AccessToken;
  refreshToken: RefreshToken;
}

export interface Token {
  value: string;
}

export interface AccessToken extends Token {
  expiresAt: number;
}

export interface RefreshToken extends Token {}

export interface IOAuthStrategy extends AuthenticationStrategy {
  generateVisitorTokens(tokens?: {
    refreshToken?: RefreshToken;
    accessToken?: AccessToken;
  }): Promise<Tokens>;
  renewToken: (refreshToken: RefreshToken) => Promise<Tokens>;
  setTokens: (tokens: Tokens) => void;
  getTokens: () => Tokens;
}

export function OAuthStrategy(config: { clientId: string }): IOAuthStrategy {
  const wixClient = createClient({ modules: { oauth } });
  const _tokens: Tokens = {
    accessToken: { value: '', expiresAt: 0 },
    refreshToken: { value: '' },
  };

  const generateVisitorTokens = async (
    tokens?: Partial<Tokens>,
  ): Promise<Tokens> => {
    if (
      tokens?.accessToken?.value &&
      tokens?.refreshToken?.value &&
      !isTokenExpired(tokens.accessToken)
    ) {
      return Promise.resolve(tokens) as Promise<Tokens>;
    }

    if (tokens?.refreshToken?.value) {
      return renewToken(tokens.refreshToken);
    }

    const tokensResponse = await wixClient.oauth.token({
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
    const tokensResponse = await wixClient.oauth.token({
      refreshToken: refreshToken.value,
      grantType: 'refresh_token',
    });
    return {
      accessToken: createAccessToken(
        tokensResponse.accessToken!,
        tokensResponse.expiresIn!,
      ),
      refreshToken,
    };
  };

  return {
    generateVisitorTokens,
    renewToken,
    getAuthHeaders: async () => {
      if (!_tokens.accessToken?.value || isTokenExpired(_tokens.accessToken)) {
        const tokens = await generateVisitorTokens({
          refreshToken: _tokens.refreshToken,
        });
        _tokens.accessToken = tokens.accessToken;
        _tokens.refreshToken = tokens.refreshToken;
      }
      return Promise.resolve({
        headers: { Authorization: _tokens.accessToken.value },
      });
    },
    setTokens: (tokens: Tokens): void => {
      _tokens.accessToken = tokens.accessToken;
      _tokens.refreshToken = tokens.refreshToken;
    },
    getTokens: () => _tokens,
  };
}
