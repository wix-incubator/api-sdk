import { AuthenticationStrategy } from '@wix/sdk-types';

export interface IApiKeyStrategy extends AuthenticationStrategy {
  setSiteId(siteId?: string): void;
  setAccountId(accountId?: string): void;
}

type Context =
  | {
      siteId: string;
      accountId?: string;
    }
  | {
      siteId?: string;
      accountId: string;
      apiKey: string;
    };

export function ApiKeyStrategy({
  siteId,
  accountId,
  apiKey,
}: { apiKey: string } & Context): IApiKeyStrategy {
  const headers: Record<string, string> = { Authorization: apiKey };
  if (siteId) {
    headers['wix-site-id'] = siteId;
  }
  if (accountId) {
    headers['wix-account-id'] = accountId;
  }
  return {
    setSiteId(_siteId: string) {
      headers['wix-site-id'] = _siteId;
    },
    setAccountId(_accountId: string) {
      headers['wix-account-id'] = _accountId;
    },
    async getAuthHeaders(): Promise<{ headers: Record<string, string> }> {
      return {
        headers,
      };
    },
  };
}
