export type RESTFunctionDescriptor<
  T extends (...args: any[]) => any = (...args: any[]) => any,
> = (httpClient: HttpClient) => T;

export interface HttpClient {
  request<T>(req: RequestOptionsFactory): Promise<HttpResponse<T>>;
}

export type RequestOptionsFactory<T = any> = (
  context: any,
) => RequestOptions<T>;

export type HttpResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  request?: any;
};

export type RequestOptions<Data = any> = {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  data?: Data;
  params?: URLSearchParams;
} & APIMetadata;

export type APIMetadata = {
  methodFqn?: string;
  entityFqdn?: string;
  packageName?: string;
};

export type BuildRESTFunction<T extends RESTFunctionDescriptor> =
  T extends RESTFunctionDescriptor<infer U> ? U : never;

export type RequestOptions<Data = any> = {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  data?: Data;
  params?: URLSearchParams;
} & APIMetadata;

export type APIMetadata = {
  methodFqn?: string;
  entityFqdn?: string;
  packageName?: string;
};

export type BuildRESTFunction<T extends RESTFunctionDescriptor> =
  T extends RESTFunctionDescriptor<infer U> ? U : never;
