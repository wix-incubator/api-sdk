import { cart, currentCart } from '@wix/ecom';
import { schedule } from '@wix/events';
import { alarms } from '@wix/motion';
import { AuthenticationStrategy, HostModule } from '@wix/sdk-types';
import { createClient } from '../wixClient';
import { VALID_TOKEN } from './fixtures/constants';

const expectStringToMatchAllOfStrings = (strings: string[]) =>
  expect.stringMatching(RegExp(strings.map((str) => `(?=.*${str})`).join('')));

describe('wixClient', () => {
  beforeEach(() => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            accessToken: VALID_TOKEN,
            refreshToken: 'some-refreshToken',
          }),
      }),
    );
  });

  describe('headers', () => {
    beforeEach(() => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: '96a61a4b-6b61-47d1-a039-0213a8230ccd',
                lineItems: [],
              },
            }),
        }),
      );
    });

    describe('default content-type', () => {
      it('should not change a content-type header if it was set (specified in lower case)', async () => {
        const client = createClient({ modules: { cart } });
        const contentTypeHeader = { 'content-type': 'made-up-content-type' };
        await client.setHeaders({
          Authorization: VALID_TOKEN,
          ...contentTypeHeader,
        });

        await client.cart.createCart({});

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining(contentTypeHeader),
          }),
        );
      });

      it('should not change a content-type header if it was set (specified in Camel Case)', async () => {
        const client = createClient({ modules: { cart } });
        const contentTypeHeader = { 'Content-Type': 'made-up-content-type' };
        await client.setHeaders({
          Authorization: VALID_TOKEN,
          ...contentTypeHeader,
        });

        await client.cart.createCart({});

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining(contentTypeHeader),
          }),
        );
      });

      it('should not set content-type to application-json if there is no body', async () => {
        const client = createClient({ modules: { cart } });
        await client.setHeaders({
          Authorization: VALID_TOKEN,
        });

        await client.fetch('test', { method: 'POST' });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(Object),
          expect.not.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          }),
        );
      });

      it.each(['POST', 'PUT', 'PATCH'])(
        `should set content-type to application-json for %s`,
        async (method) => {
          const client = createClient({ modules: { cart } });
          await client.setHeaders({
            Authorization: VALID_TOKEN,
          });

          await client.fetch('test', {
            method,
            body: JSON.stringify({ foo: 'bar' }),
          });

          expect(global.fetch).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
              headers: expect.objectContaining({
                'Content-Type': 'application/json',
              }),
            }),
          );
        },
      );

      it.each(['DELETE', 'GET', 'OPTIONS'])(
        `should not set content-type for %s`,
        async (method) => {
          const client = createClient({ modules: { cart } });
          await client.setHeaders({
            Authorization: VALID_TOKEN,
          });

          await client.fetch('test', { method });

          expect(global.fetch).toHaveBeenCalledWith(
            expect.any(Object),
            expect.not.objectContaining({
              headers: expect.objectContaining({
                'Content-Type': expect.any(String),
              }),
            }),
          );
        },
      );
    });

    it('should send a BI header', async () => {
      const client = createClient({ modules: { alarms } });

      await client.alarms.alarm(100, {});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-wix-bi-gateway': expectStringToMatchAllOfStrings([
              'environment=js-sdk',
              'package-name=@wix/motion',
              'method-fqn=wix.coreservices.alarm.v1.AlarmService.Alarm',
              'entity=wix.alarm.v1.alarm',
            ]),
          }),
        }),
      );
    });

    it('should support setting headers', async () => {
      const client = createClient({ modules: { cart } });

      await client.setHeaders({
        Authorization: VALID_TOKEN,
      });

      await client.cart.createCart({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: VALID_TOKEN }),
        }),
      );
    });

    it('should support setting headers when creating client', async () => {
      const token =
        'vqSVCBy6xYPLdlbEUSHvpz0Vv7iNxLJI_Enoolg4Ifs.eyJpbnN0YW5jZUlkIjoiMmViMDhmZmYtMDkwOS00YWYxLTgyMjUtYmJhOTY2NTE5OThiIiwiYXBwRGVmSWQiOiIxMzgwYjcwMy1jZTgxLWZmMDUtZjExNS0zOTU3MWQ5NGRmY2QiLCJtZXRhU2l0ZUlkIjoiNzNjYTBiYmItOGZiYi00N2Y5LTg3MjQtODIyNjczZWM4MjE2Iiwic2lnbkRhdGUiOiIyMDIyLTA4LTA4VDA3OjE1OjEyLjU0OVoiLCJ1aWQiOiJkYTMzYWM2Yy00YjRlLTRkNTUtYmEyMS1jNzg5ZTU3NTk1MTQiLCJ2ZW5kb3JQcm9kdWN0SWQiOiJzdG9yZXNfc2lsdmVyIiwiZGVtb01vZGUiOmZhbHNlLCJhaWQiOiJiYWNhODEyOS1mYzIyLTRmYTktOGFlZC0zNTI5NTIxMjUzNjIiLCJiaVRva2VuIjoiNWQ3YTg0NDQtODZiMi0wZDA4LTA1MDEtMzk4ZjE1YmQxYjlkIiwic2l0ZU93bmVySWQiOiJlNzZkNzE0NC00MjkzLTRlYWYtYThkOS0wMGMyODlmNDdiNWIiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjItMDgtMDhUMTE6MTU6MTIuNTQ5WiIsImhhc1VzZXJSb2xlIjpmYWxzZX0';

      const client = createClient({
        modules: { cart },
        headers: { Authorization: token },
      });

      await client.cart.createCart({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: token }),
        }),
      );
    });
  });

  describe('GET', () => {
    it('should support get request with params', async () => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              total: 4,
              limit: 10,
              offset: 0,
              items: [],
            }),
        }),
      );
      const token =
        'vqSVCBy6xYPLdlbEUSHvpz0Vv7iNxLJI_Enoolg4Ifs.eyJpbnN0YW5jZUlkIjoiMmViMDhmZmYtMDkwOS00YWYxLTgyMjUtYmJhOTY2NTE5OThiIiwiYXBwRGVmSWQiOiIxMzgwYjcwMy1jZTgxLWZmMDUtZjExNS0zOTU3MWQ5NGRmY2QiLCJtZXRhU2l0ZUlkIjoiNzNjYTBiYmItOGZiYi00N2Y5LTg3MjQtODIyNjczZWM4MjE2Iiwic2lnbkRhdGUiOiIyMDIyLTA4LTA4VDA3OjE1OjEyLjU0OVoiLCJ1aWQiOiJkYTMzYWM2Yy00YjRlLTRkNTUtYmEyMS1jNzg5ZTU3NTk1MTQiLCJ2ZW5kb3JQcm9kdWN0SWQiOiJzdG9yZXNfc2lsdmVyIiwiZGVtb01vZGUiOmZhbHNlLCJhaWQiOiJiYWNhODEyOS1mYzIyLTRmYTktOGFlZC0zNTI5NTIxMjUzNjIiLCJiaVRva2VuIjoiNWQ3YTg0NDQtODZiMi0wZDA4LTA1MDEtMzk4ZjE1YmQxYjlkIiwic2l0ZU93bmVySWQiOiJlNzZkNzE0NC00MjkzLTRlYWYtYThkOS0wMGMyODlmNDdiNWIiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjItMDgtMDhUMTE6MTU6MTIuNTQ5WiIsImhhc1VzZXJSb2xlIjpmYWxzZX0';

      const client = createClient({
        modules: { schedule },
        headers: { Authorization: token },
      });

      await client.schedule.listScheduleItems({ limit: 5, eventId: ['123'] });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/events/v1/schedule?eventId=123&limit=5',
        expect.any(Object),
      );
    });

    it('should support get request without params', async () => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: 'cart-id',
                lineItems: [],
              },
            }),
        }),
      );
      const token =
        'vqSVCBy6xYPLdlbEUSHvpz0Vv7iNxLJI_Enoolg4Ifs.eyJpbnN0YW5jZUlkIjoiMmViMDhmZmYtMDkwOS00YWYxLTgyMjUtYmJhOTY2NTE5OThiIiwiYXBwRGVmSWQiOiIxMzgwYjcwMy1jZTgxLWZmMDUtZjExNS0zOTU3MWQ5NGRmY2QiLCJtZXRhU2l0ZUlkIjoiNzNjYTBiYmItOGZiYi00N2Y5LTg3MjQtODIyNjczZWM4MjE2Iiwic2lnbkRhdGUiOiIyMDIyLTA4LTA4VDA3OjE1OjEyLjU0OVoiLCJ1aWQiOiJkYTMzYWM2Yy00YjRlLTRkNTUtYmEyMS1jNzg5ZTU3NTk1MTQiLCJ2ZW5kb3JQcm9kdWN0SWQiOiJzdG9yZXNfc2lsdmVyIiwiZGVtb01vZGUiOmZhbHNlLCJhaWQiOiJiYWNhODEyOS1mYzIyLTRmYTktOGFlZC0zNTI5NTIxMjUzNjIiLCJiaVRva2VuIjoiNWQ3YTg0NDQtODZiMi0wZDA4LTA1MDEtMzk4ZjE1YmQxYjlkIiwic2l0ZU93bmVySWQiOiJlNzZkNzE0NC00MjkzLTRlYWYtYThkOS0wMGMyODlmNDdiNWIiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjItMDgtMDhUMTE6MTU6MTIuNTQ5WiIsImhhc1VzZXJSb2xlIjpmYWxzZX0';

      const client = createClient({
        modules: { currentCart },
        headers: { Authorization: token },
      });

      await client.currentCart.getCurrentCart();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/ecom/v1/carts/current',
        expect.any(Object),
      );
    });
  });

  describe('host modules', () => {
    it('should support host modules', async () => {
      const aHost = {
        aHostFunction: (a: number) => Promise.resolve(a + 1),
        getAuth: () => `the-auth-token`,
      };

      const hostModule: HostModule<
        {
          aHostFunction: (a: number) => Promise<number>;
        },
        typeof aHost
      > = {
        __type: 'host',
        create: (host) => ({
          aHostFunction: (a: number) => host.aHostFunction(a),
        }),
      };

      const client = createClient({
        host: aHost,
        modules: { hostModule },
        auth: {
          getAuthHeaders: async () => ({
            headers: {},
          }),
        },
      });

      expect(client.hostModule.aHostFunction(1)).resolves.toBe(2);
    });

    it('should pass host to the authentication strategy to get headers', async () => {
      const aHost = {
        getAuth: () => `the-auth-token`,
      };

      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: 'cart-id',
                lineItems: [],
              },
            }),
        }),
      );
      const auth = () => {
        return {
          getAuthHeaders: async (host: typeof aHost) => ({
            headers: { Authorization: host.getAuth() },
          }),
        } as AuthenticationStrategy<typeof aHost>;
      };

      const client = createClient({
        host: aHost,
        modules: { currentCart },
        auth: auth(),
      });

      await client.currentCart.getCurrentCart();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.wixapis.com/ecom/v1/carts/current',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'the-auth-token',
          }),
        }),
      );
    });
  });

  describe('use', () => {
    it('should initialize a direct rest function descriptor', async () => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: 'cart-id',
                lineItems: [],
              },
            }),
        }),
      );

      const client = createClient({ modules: {} });

      const theCurrentCart = await client.use(currentCart.getCurrentCart)();

      expect(theCurrentCart).toEqual({ _id: 'cart-id', lineItems: [] });
    });

    it('should initialize a direct host module', async () => {
      const aHost = {
        aHostFunction: (a: number) => a + 1,
      };

      const hostModule: HostModule<
        {
          aHostFunction: (a: number) => number;
        },
        typeof aHost
      > = {
        __type: 'host',
        create: (host) => ({
          aHostFunction: (a: number) => host.aHostFunction(a),
        }),
      };

      const client = createClient({ host: aHost });

      const theHostModule = client.use(hostModule);

      expect(theHostModule.aHostFunction(4)).toEqual(5);
    });

    it('should initialize nested modules', async () => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              cart: {
                id: 'cart-id',
                lineItems: [],
              },
            }),
        }),
      );

      const aHost = {
        aHostFunction: (a: number) => a + 1,
      };

      const hostModule: HostModule<
        {
          aHostFunction: (a: number) => number;
        },
        typeof aHost
      > = {
        __type: 'host',
        create: (host) => ({
          aHostFunction: (a: number) => host.aHostFunction(a),
        }),
      };

      const client = createClient({ host: aHost });

      const { hostModule: theHostModule, currentCart: theCurrentCart } =
        client.use({ hostModule, currentCart });

      expect(theHostModule.aHostFunction(4)).toEqual(5);
      expect(await theCurrentCart.getCurrentCart()).toEqual({
        _id: 'cart-id',
        lineItems: [],
      });
    });
  });
});
