// we follow a simplified version of the axios convention
// https://github.com/axios/axios/blob/649d739288c8e2c55829ac60e2345a0f3439c730/lib/defaults/index.js#L65
export const getDefaultContentHeader = (
  options: RequestInit | undefined,
): { 'Content-Type'?: string } => {
  if (
    options?.method &&
    ['post', 'put', 'patch'].includes(options.method.toLocaleLowerCase()) &&
    options.body
  ) {
    return { 'Content-Type': 'application/json' };
  }

  return {};
};

export const isObject = (val: any): val is Object =>
  val && typeof val === 'object' && !Array.isArray(val);
