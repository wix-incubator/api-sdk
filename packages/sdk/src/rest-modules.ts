import { biHeaderGenerator } from './bi/biHeaderGenerator';
import { API_URL, PublicMetadata, READ_ONLY_API_URL } from './common';
import { BuildRESTFunction, RESTFunctionDescriptor } from '@wix/sdk-types';

export function buildRESTDescriptor<T extends RESTFunctionDescriptor>(
  origFunc: T,
  publicMetadata: PublicMetadata,
  boundFetch: typeof fetch,
): BuildRESTFunction<T> {
  return origFunc({
    request: async (factory: any) => {
      const requestOptions = factory({ host: API_URL });
      const domain =
        requestOptions.method === 'GET' ||
        requestOptions.url.indexOf('query') > -1
          ? READ_ONLY_API_URL
          : API_URL;
      let url = `https://${domain}${requestOptions.url}`;
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
        return {
          data,
          headers: res.headers,
          status: res.status,
          statusText: res.statusText,
        };
      } catch (e: any) {
        if (e.message?.includes('fetch is not defined')) {
          console.error('Node.js v18+ is required');
        }
        throw e;
      }
    },
  }) as BuildRESTFunction<T>;
}

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
