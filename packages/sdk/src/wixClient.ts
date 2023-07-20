import {
  AuthenticationStrategy,
  BuildRESTFunction,
  HostModule,
  HostModuleAPI,
  RESTFunctionDescriptor,
} from '@wix/sdk-types';
import { ConditionalExcept, EmptyObject } from 'type-fest';
import { API_URL, PUBLIC_METADATA_KEY, PublicMetadata } from './common';
import { getDefaultContentHeader, isObject } from './helpers';
import { buildRESTDescriptor } from './rest-modules';
import { buildHostModule, isHostModule } from './host-modules';

type Headers = { Authorization: string } & Record<string, string>;

/**
 * This type takes in a descriptors object of a certain Host (including an `unknown` host)
 * and returns an object with the same structure, but with all descriptors replaced with their API.
 * Any non-descriptor properties are removed from the returned object, including descriptors that
 * do not match the given host (as they will not work with the given host).
 */
export type BuildDescriptors<T extends Descriptors<any>> = T extends HostModule<
  any,
  any
>
  ? HostModuleAPI<T>
  : T extends RESTFunctionDescriptor
  ? BuildRESTFunction<T>
  : ConditionalExcept<
      {
        [Key in keyof T]: T[Key] extends Descriptors<any>
          ? BuildDescriptors<T[Key]>
          : never;
      },
      EmptyObject
    >;

/**
 * Descriptors are objects that describe the API of a module, and the module
 * can either be a REST module or a host module.
 * This type is recursive, so it can describe nested modules.
 */
export type Descriptors<Host> =
  | RESTFunctionDescriptor
  | HostModule<any, Host>
  | {
      // the `| any` is needed to allow non descriptor properties
      // that will be ignored at runtime (like modules that export export enums in addition to functions)
      [key: string]: Descriptors<Host> | PublicMetadata | any;
    };

/**
 * This type is used in `createClient` to ensure that the given host matches the host of the given descriptors.
 * If the host does not match, the descriptor is replaced with a host module that will throw an error when used.
 */
export type AssertHostMatches<
  T extends Descriptors<any>,
  Host,
> = T extends HostModule<any, infer U>
  ? Host extends U
    ? T
    : HostModule<any, Host>
  : {
      [Key in keyof T]: T[Key] extends Descriptors<any>
        ? AssertHostMatches<T[Key], Host>
        : T[Key];
    };

export type WixClient<
  T extends Descriptors<Host> = Descriptors<unknown>,
  Z extends AuthenticationStrategy<Host> = AuthenticationStrategy<unknown>,
  Host = unknown,
> = {
  setHeaders(headers: Headers): void;
  auth: Z;
  fetch(relativeUrl: string, options: RequestInit): Promise<Response>;
  use<R extends Descriptors<Host> = EmptyObject>(
    modules: AssertHostMatches<R, Host>,
  ): BuildDescriptors<R>;
} & BuildDescriptors<T>;

export function createClient<
  T extends Descriptors<Host> = EmptyObject,
  Z extends AuthenticationStrategy<Host> = AuthenticationStrategy<unknown>,
  Host = unknown,
>(config: {
  modules?: AssertHostMatches<T, Host>;
  auth?: Z;
  headers?: Headers;
  host?: Host;
}): WixClient<T, Z, Host> {
  const _headers: Headers = config.headers || { Authorization: '' };
  const authStrategy = config.auth || {
    getAuthHeaders: () => Promise.resolve({ headers: {} }),
  };

  const boundFetch: typeof fetch = async (url, options) => {
    const authHeaders = await authStrategy.getAuthHeaders(config.host);
    const defaultContentTypeHeader = getDefaultContentHeader(options);

    return fetch(url, {
      ...options,
      headers: {
        ...defaultContentTypeHeader,
        ..._headers,
        ...authHeaders?.headers,
        ...options?.headers,
      },
    });
  };

  // This is typed as `any` because when trying to properly type it as defined
  // on the WixClient, typescript starts failing with `Type instantiation is
  // excessively deep and possibly infinite.`
  const use: any = (modules: any, metadata?: PublicMetadata) => {
    if (isHostModule(modules)) {
      return buildHostModule(
        modules as HostModule<unknown, unknown>,
        config.host,
      );
    } else if (typeof modules === 'function') {
      return buildRESTDescriptor(
        modules as RESTFunctionDescriptor,
        metadata ?? {},
        boundFetch,
      );
    } else if (isObject(modules)) {
      return Object.fromEntries(
        Object.entries(
          modules as {
            [key: string]: Descriptors<Host> | PublicMetadata | any;
          },
        ).map(([key, value]) => {
          return [key, use(value, (modules as any)[PUBLIC_METADATA_KEY])];
        }),
      );
    } else {
      return modules;
    }
  };

  const setHeaders = (headers: Headers) => {
    for (const k in headers) {
      _headers[k] = headers[k];
    }
  };

  const wrappedModules = config.modules ? use(config.modules) : {};
  return {
    ...wrappedModules,
    auth: authStrategy,
    setHeaders,
    use,
    fetch: (relativeUrl: string, options?: RequestInit) => {
      const finalUrl = new URL(relativeUrl, `https://${API_URL}`);
      finalUrl.host = API_URL;
      finalUrl.protocol = 'https';
      return boundFetch(finalUrl, options);
    },
  };
}
