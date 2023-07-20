import * as React from 'react';
import { createContext, useMemo } from 'react';
import {
  AuthenticationStrategy,
  BuildDescriptors,
  Descriptors,
  WixClient,
  createClient,
  AssertHostMatches,
} from '@wix/api-client';

export * from '@wix/api-client';

const WixContext = createContext<WixClient | undefined>(undefined);

export function WixProvider<
  T extends Descriptors<Host>,
  Host = unknown,
>(props: {
  children: React.ReactNode;
  auth?: AuthenticationStrategy<Host>;
  modules?: AssertHostMatches<T, Host>;
  host?: Host;
}) {
  const { children, auth, modules, host } = props;
  const client = useMemo(
    () =>
      createClient({
        auth,
        modules,
        host,
      }),
    [auth, modules, host],
  );
  return <WixContext.Provider value={client}>{children}</WixContext.Provider>;
}

export function useWix<T extends WixClient = WixClient>() {
  const sdk = React.useContext(WixContext);
  if (!sdk) {
    throw new Error(
      'SDK context not found. Make sure to render SDKProvider in the component tree',
    );
  }
  return sdk as T;
}

export function useWixAuth<T extends AuthenticationStrategy>() {
  const sdk = useWix();
  return sdk.auth as T;
}

export function useWixModules<T extends Descriptors<unknown>>(
  modules: T,
): BuildDescriptors<T> {
  const sdk = useWix();
  return useMemo(() => sdk.use(modules), [sdk, modules]);
}
