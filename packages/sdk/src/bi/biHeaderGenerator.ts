import { PublicMetadata } from '../common';

export const WixBIHeaderName = 'x-wix-bi-gateway';

export type WixBIHeader = {
  [WixBIHeaderName]: WixBIHeaderValues;
};

export type WixBIHeaderValues = {
  ['environment']: 'js-sdk';
  ['package-name']?: string;
  ['method-fqn']?: string;
  ['entity']?: string;
};

export function biHeaderGenerator(
  requestOptions: any,
  publicMetadata: PublicMetadata,
): { [WixBIHeaderName]: string } {
  return {
    [WixBIHeaderName]: objectToKeyValue({
      environment: 'js-sdk',
      'package-name': publicMetadata?.PACKAGE_NAME,
      'method-fqn': requestOptions?.methodFqn,
      entity: requestOptions?.entityFqdn,
    }),
  };
}

function objectToKeyValue(input: WixBIHeaderValues): string {
  return Object.entries(input)
    .filter(([_, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}
