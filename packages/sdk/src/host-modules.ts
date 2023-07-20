import { HostModule } from '@wix/sdk-types';
import { isObject } from './helpers';

export const isHostModule = (val: any): val is HostModule<unknown, unknown> =>
  isObject(val) && val.__type === 'host';

export function buildHostModule(
  val: HostModule<unknown, unknown>,
  host: unknown,
) {
  return val.create(host);
}
