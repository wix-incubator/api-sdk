import { authentication } from '@wix/identity';
import { AuthenticationStrategy } from '@wix/sdk-types';

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
  captchaTokens?: { invisibleRecaptchaToken?: string; recaptchaToken?: string };
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
  getAuthUrl: (
    oauthData: OauthData,
    opts?: { prompt?: 'login' | 'none' },
  ) => Promise<{ authUrl: string }>;
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
  processVerification<T extends ProcessableState>(
    nextInputs: CalculateNextState<T>,
  ): Promise<StateMachine>;
  /**
   * @deprecated use processVerification instead
   */
  proceed<T extends ProcessableState>(
    nextInputs: DeprecatedCalculateNextState<T>,
  ): Promise<StateMachine>;
  /**
   * @deprecated use getMemberTokensForDirectLogin instead
   */
  complete: (sessionToken: string) => Promise<Tokens>;
  getMemberTokensForDirectLogin: (sessionToken: string) => Promise<Tokens>;
  /**
   * @deprecated use sendPasswordResetEmail instead
   */
  sendResetPasswordMail: (email: string, redirectUri: string) => Promise<void>;
  sendPasswordResetEmail: (email: string, redirectUri: string) => Promise<void>;
  getRecaptchaScriptUrl: () => string;
  getRecaptchaToken: () => Promise<string>;
  loggedIn: () => boolean;
}

export enum LoginState {
  SUCCESS = 'SUCCESS',
  INITIAL = 'INITIAL',
  FAILURE = 'FAILURE',
  EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED',
  OWNER_APPROVAL_REQUIRED = 'OWNER_APPROVAL_REQUIRED',
  USER_CAPTCHA_REQUIRED = 'USER_CAPTCHA_REQUIRED',
  SILENT_CAPTCHA_REQUIRED = 'SILENT_CAPTCHA_REQUIRED',
}

interface LoginResults<SK extends string, LK extends LoginState> {
  /**
   * @deprecated use loginState instead
   */
  stateKind: SK;
  loginState: LK;
}

interface SuccessState extends LoginResults<'success', LoginState.SUCCESS> {
  data: {
    sessionToken: string;
  };
}

interface InitialState extends LoginResults<'initial', LoginState.INITIAL> {}

interface ErrorState extends LoginResults<'failure', LoginState.FAILURE> {
  errorCode?:
    | 'invalidEmail'
    | 'invalidPassword'
    | 'resetPassword'
    | 'missingCaptchaToken'
    | 'emailAlreadyExists'
    | 'invalidCaptchaToken';
  error: string;
}

interface EmailVerificationRequiredState
  extends LoginResults<
    'emailVerificationRequired',
    LoginState.EMAIL_VERIFICATION_REQUIRED
  > {
  data: {
    stateToken: string;
  };
}

interface OwnerApprovalRequiredState
  extends LoginResults<
    'ownerApprovalRequired',
    LoginState.OWNER_APPROVAL_REQUIRED
  > {}

interface SilentCaptchaRequiredState
  extends LoginResults<
    'silentCaptchaRequired',
    LoginState.SILENT_CAPTCHA_REQUIRED
  > {
  data: {
    stateToken: string;
  };
}

interface UserCaptchaRequiredState
  extends LoginResults<
    'userCaptchaRequired',
    LoginState.USER_CAPTCHA_REQUIRED
  > {
  data: {
    stateToken: string;
  };
}

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

type DeprecatedCode = {
  /**
   * @deprecated use verificationCode instead
   */
  code: string;
};

type VerificationCode = {
  verificationCode: string;
};

export type DeprecatedCalculateNextState<T> =
  T extends EmailVerificationRequiredState ? DeprecatedCode : never;

export type CalculateNextState<T> = T extends EmailVerificationRequiredState
  ? VerificationCode
  : never;

export type ProcessableState = EmailVerificationRequiredState;
