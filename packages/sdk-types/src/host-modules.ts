export type HostModule<T, Host> = {
  __type: 'host';
  create(host: Host): T;
};

export type HostModuleAPI<T extends HostModule<any, any>> =
  T extends HostModule<infer U, any> ? U : never;
