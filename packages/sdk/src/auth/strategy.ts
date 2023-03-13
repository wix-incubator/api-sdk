type AuthenticationStrategy = {
  getAuthHeaders: () => Promise<{ headers: Record<string, string> }>;
};
