export interface IApiKeyStrategy extends AuthenticationStrategy {
  setSiteId(siteId?: string): void;
  setAccountId(accountId?: string): void;
}

export function ApiKeyStrategy({
  siteId,
  accountId,
  apiKey,
}: {
  siteId?: string;
  accountId?: string;
  apiKey: string;
}): IApiKeyStrategy {
  const headers: Record<string, string> = { Authorization: apiKey };
  if (siteId) {
    headers['wix-site-id'] = siteId;
  }
  if (accountId) {
    headers['wix-account-id'] = accountId;
  }
  return {
    setSiteId(siteId: string) {
      headers['wix-site-id'] = siteId;
    },
    setAccountId(accountId: string) {
      headers['wix-account-id'] = accountId;
    },
    async getAuthHeaders(): Promise<{ headers: Record<string, string> }> {
      return {
        headers,
      };
    },
  };
}
