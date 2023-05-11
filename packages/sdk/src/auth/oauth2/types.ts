import { authentication } from '@wix/identity';
import { AuthenticationStrategy } from '../strategy';

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

export interface RefreshToken extends Token {
  role: TokenRole;
}

export interface OauthData extends OauthPKCE {
  originalUri: string;
  redirectUri: string;
}

export interface OauthPKCE {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

export interface RegisterParams extends LoginParams {
  profile?: authentication.IdentityProfile;
}

export interface LoginParams {
  email: string;
  password: string;
  captchaTokens?: { invisibleRecaptcha?: string; recaptcha?: string };
}

export interface IOAuthStrategy extends AuthenticationStrategy {
  generateVisitorTokens(tokens?: {
    refreshToken?: RefreshToken;
    accessToken?: AccessToken;
  }): Promise<Tokens>;
  renewToken: (refreshToken: RefreshToken) => Promise<Tokens>;
  setTokens: (tokens: Tokens) => void;
  getTokens: () => Tokens;
  generateOAuthData: (redirectUri: string, originalUri?: string) => OauthData;
  getAuthUrl: (oauthData: OauthData) => Promise<{ authUrl: string }>;
  getMemberTokens: (
    code: string,
    state: string,
    oauthData: OauthData,
  ) => Promise<Tokens>;
  logout: (originalUrl: string) => Promise<{ logoutUrl: string }>;
  parseFromUrl: () => {
    code: string;
    state: string;
    error?: string;
    errorDescription?: string;
  };
  register: (params: RegisterParams) => Promise<StateMachine>;
  login: (params: LoginParams) => Promise<StateMachine>;
  proceed<T extends ProcessableState>(
    nextInputs: CalculateNextState<T>,
  ): Promise<StateMachine>;
  complete: (sessionToken: string) => Promise<Tokens>;
  sendResetPasswordMail: (email: string, redirectUri: string) => Promise<void>;
  getRecaptchaScriptUrl: () => string;
  getRecaptchaToken: () => Promise<string>;
  loggedIn: () => boolean;
}

type SuccessState = {
  stateKind: 'success';
  data: {
    sessionToken: string;
  };
};

type InitialState = {
  stateKind: 'initial';
};

type ErrorState = {
  stateKind: 'failure';
  errorCode?:
    | 'invalidEmail'
    | 'invalidPassword'
    | 'resetPassword'
    | 'missingCaptchaToken'
    | 'emailAlreadyExists'
    | 'invalidCaptchaToken';
  error: string;
};

type EmailVerificationRequiredState = {
  stateKind: 'emailVerificationRequired';
  data: {
    stateToken: string;
  };
};

type OwnerApprovalRequiredState = {
  stateKind: 'ownerApprovalRequired';
};

type SilentCaptchaRequiredState = {
  stateKind: 'silentCaptchaRequired';
  data: {
    stateToken: string;
  };
};

type UserCaptchaRequiredState = {
  stateKind: 'userCaptchaRequired';
  data: {
    stateToken: string;
  };
};

export enum TokenRole {
  NONE = 'none',
  VISITOR = 'visitor',
  MEMBER = 'member',
}

export type StateMachine =
  | InitialState
  | SuccessState
  | ErrorState
  | EmailVerificationRequiredState
  | OwnerApprovalRequiredState
  | SilentCaptchaRequiredState
  | UserCaptchaRequiredState;

export type CalculateNextState<T> = T extends EmailVerificationRequiredState
  ? {
    code: string;
  }
  : never;

export type ProcessableState = EmailVerificationRequiredState;
