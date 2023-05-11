// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare type RequestOptions<T = any> = any;

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
