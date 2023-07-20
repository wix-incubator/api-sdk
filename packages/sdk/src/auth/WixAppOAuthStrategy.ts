import { AuthenticationStrategy } from './strategy';

export function WixAppOAuthStrategy(opts: {
  appId: string;
  appSecret: string;
  refreshToken?: string;
}): AuthenticationStrategy & {
  getInstallUrl({ redirectUrl }: { redirectUrl: string }): string;
  handleOAuthCallback(
    url: string,
  ): Promise<{ instanceId: string; accessToken: string; refreshToken: string }>;
} {
  let accessToken: string | undefined;
  let refreshToken = opts.refreshToken;

  return {
    getInstallUrl({ redirectUrl }) {
      return `https://www.wix.com/installer/install?appId=${opts.appId}&redirectUrl=${redirectUrl}`;
    },
    async handleOAuthCallback(url: string) {
      const params = new URLSearchParams(new URL(url).search);
      const code = params.get('code');
      const instanceId = params.get('instanceId');
      if (!code || !instanceId) {
        throw new Error('Missing code or instanceId');
      }

      const tokensRes = await fetch('https://www.wixapis.com/oauth/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: opts.appId,
          client_secret: opts.appSecret,
          grant_type: 'authorization_code',
        }),
      });

      if (tokensRes.status !== 200) {
        throw new Error('Failed to get tokens');
      }

      const tokens = await tokensRes.json();

      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;

      return {
        instanceId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    },
    async getAuthHeaders(): Promise<{ headers: Record<string, string> }> {
      if (!refreshToken) {
        throw new Error('Missing refresh token');
      }

      if (!accessToken) {
        const tokensRes = await fetch('https://www.wixapis.com/oauth/access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            client_id: opts.appId,
            client_secret: opts.appSecret,
            grant_type: 'refresh_token',
          }),
        });

        if (tokensRes.status !== 200) {
          throw new Error('Failed to get access token');
        }

        const tokens = (await tokensRes.json()) as {
          access_token: string;
          refresh_token: string;
        };
        accessToken = tokens.access_token;
        refreshToken = tokens.refresh_token;
      }

      return {
        headers: {
          Authorization: accessToken,
        },
      };
    },
  };
}
