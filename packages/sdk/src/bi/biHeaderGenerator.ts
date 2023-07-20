import { APIMetadata } from '@wix/sdk-types';
import { PublicMetadata } from '../common';

export const WixBIHeaderName = 'x-wix-bi-gateway';

export type WixBIHeaderValues = {
  ['environment']: 'js-sdk';
  ['package-name']?: string;
  ['method-fqn']?: string;
  ['entity']?: string;
};

export function biHeaderGenerator(
  apiMetadata: APIMetadata,
  publicMetadata?: PublicMetadata,
): { [WixBIHeaderName]: string } {
  return {
    [WixBIHeaderName]: objectToKeyValue({
      environment: 'js-sdk',
      'package-name': apiMetadata.packageName ?? publicMetadata?.PACKAGE_NAME,
      'method-fqn': apiMetadata.methodFqn,
      entity: apiMetadata.entityFqdn,
    }),
  };
}

function objectToKeyValue(input: WixBIHeaderValues): string {
  return Object.entries(input)
    .filter(([_, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}
