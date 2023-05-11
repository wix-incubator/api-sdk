import { Simplify } from 'type-fest';
import { AuthenticationStrategy } from './auth/strategy';
import { biHeaderGenerator } from './bi/biHeaderGenerator';
import { PublicMetadata, PUBLIC_METADATA_KEY, API_URL } from './common';

type Headers = { Authorization: string } & Record<string, string>;

type WithoutFunctionWrapper<T> = {
  [Key in keyof T]: T[Key] extends (...args: any) => any
    ? ReturnType<T[Key]>
    : Simplify<WithoutFunctionWrapper<T[Key]>>;
};

export interface IWrapper<Z extends AuthenticationStrategy> {
  setHeaders(headers: Headers): void;
  auth: Z;
  fetch(relativeUrl: string, options: RequestInit): Promise<Response>;
}

const wrapperBuilder = <T extends Function>(
  origFunc: T,
  publicMetadata: PublicMetadata,
  boundFetch: typeof fetch,
  // @ts-expect-error
): ReturnType<T> => {
  return origFunc({
    request: async (factory: any) => {
      const requestOptions = factory({ host: API_URL });
      let url = `https://${API_URL}${requestOptions.url}`;
      if (requestOptions.params && requestOptions.params.toString()) {
        url += `?${requestOptions.params.toString()}`;
      }
      try {
        const biHeader = biHeaderGenerator(requestOptions, publicMetadata);
        const res = await boundFetch(url, {
          method: requestOptions.method,
          ...(requestOptions.data && {
            body: JSON.stringify(requestOptions.data),
          }),
          headers: {
            ...biHeader,
          },
        });
        if (res.status !== 200) {
          let dataError: any = null;
          try {
            dataError = await res.json();
          } catch (e) {
            //
          }
          throw errorBuilder(
            res.status,
            dataError?.message,
            dataError?.details,
            {
              requestId: res.headers.get('X-Wix-Request-Id'),
              details: dataError,
            },
          );
        }
        const data = await res.json();
        return { data };
      } catch (e: any) {
        if (e.message?.includes('fetch is not defined')) {
          console.error('Node.js v18+ is required');
        }
        throw e;
      }
    },
  });
};

const errorBuilder = (
  code: number,
  description: string,
  details?: any,
  data?: Record<string, any>,
) => {
  return {
    response: {
      data: {
        details: {
          ...(!details?.validationError && {
            applicationError: {
              description,
              code,
              data,
            },
          }),
          ...details,
        },
        message: description,
      },
      status: code,
    },
  };
};

export function createClient<
  T = any,
  Z extends AuthenticationStrategy = any,
>(config: {
  modules?: T;
  auth?: Z;
  headers?: Headers;
}): WithoutFunctionWrapper<T> & IWrapper<Z> {
  const _headers: Headers = config.headers || { Authorization: '' };
  const authStrategy = config.auth || {
    getAuthHeaders: () => Promise.resolve({ headers: {} }),
  };

  const boundFetch: typeof fetch = async (url, options) => {
    const authHeaders = await authStrategy.getAuthHeaders();
    return fetch(url, {
      ...options,
      headers: {
        ..._headers,
        ...authHeaders?.headers,
        ...options?.headers,
      },
    });
  };

  const isObject = (val: any) =>
    val && typeof val === 'object' && !Array.isArray(val);

  const traverse = (obj: any) => {
    return Object.entries(obj).reduce((prev: any, [key, value]) => {
      if (isObject(value)) {
        prev[key] = traverse(value);
      } else if (typeof obj[key] === 'function') {
        prev[key] = wrapperBuilder(
          value as Function,
          obj[PUBLIC_METADATA_KEY] ?? {},
          boundFetch,
        );
      } else {
        prev[key] = value;
      }
      return prev;
    }, {});
  };

  const setHeaders = (headers: Headers) => {
    for (const k in headers) {
      _headers[k] = headers[k];
    }
  };

  const wrappedModules = config.modules ? traverse(config.modules) : {};
  return {
    ...wrappedModules,
    auth: authStrategy,
    setHeaders,
    fetch: (relativeUrl: string, options: RequestInit) => {
      const finalUrl = new URL(relativeUrl, `https://${API_URL}`);
      finalUrl.host = API_URL;
      finalUrl.protocol = 'https';
      return boundFetch(finalUrl, options);
    },
  };
}
