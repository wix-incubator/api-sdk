import { Simplify } from 'type-fest';

type Headers = { Authorization: string } & Record<string, string>;

type WithoutFunctionWrapper<T> = {
  [Key in keyof T]: T[Key] extends (...args: any) => any
    ? ReturnType<T[Key]>
    : Simplify<WithoutFunctionWrapper<T[Key]>>;
};

export interface IWrapper {
  setHeaders(headers: Headers): void;
}

const API_URL = 'www.wixapis.com';

const wrapperBuilder = <T extends Function>(
  origFunc: T,
  headers: Headers,
  // @ts-expect-error
): ReturnType<T> => {
  return origFunc({
    request: async (factory: any) => {
      if (!headers.Authorization) {
        // eslint-disable-next-line no-throw-literal
        throw errorBuilder(
          500,
          'You must set Authorization header before triggering a call',
        );
      }

      const requestOptions = factory({ host: API_URL });
      try {
        const res = await fetch(`https://${API_URL}${requestOptions.url}`, {
          method: requestOptions.method,
          ...(requestOptions.data && {
            body: JSON.stringify(requestOptions.data),
          }),
          headers: {
            'Content-Type': 'application/json',
            ...headers,
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

const errorBuilder = (code: number, description: string, details?: any) => {
  return {
    response: {
      data: {
        details: {
          ...details,
          ...(!details?.validationError && {
            applicationError: {
              description,
              code,
            },
          }),
        },
        message: description,
      },
      status: code,
    },
  };
};

export function createClient<T = any>(config: {
  modules: T;
  headers?: Headers;
}): WithoutFunctionWrapper<T> & IWrapper {
  if (!config.modules || Object.entries(config.modules).length < 1) {
    throw new Error('Missing modules');
  }

  const _headers: Headers = config.headers || { Authorization: '' };
  const isObject = (val: any) =>
    val && typeof val === 'object' && !Array.isArray(val);

  const traverse = (obj: any) => {
    return Object.entries(obj).reduce((prev: any, [key, value]) => {
      if (isObject(value)) {
        prev[key] = traverse(value);
      } else if (typeof obj[key] === 'function') {
        prev[key] = wrapperBuilder(value as Function, _headers);
      } else {
        prev[key] = value;
      }
      return prev;
    }, {});
  };

  const wrappedModules = traverse(config.modules);
  return {
    ...wrappedModules,
    setHeaders: (headers: Headers) => {
      for (const k in headers) {
        _headers[k] = headers[k];
      }
    },
  };
}
