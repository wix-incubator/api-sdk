export type AuthenticationStrategy<Host = unknown> = {
  getAuthHeaders: (host?: Host) => Promise<{ headers: Record<string, string> }>;
};
