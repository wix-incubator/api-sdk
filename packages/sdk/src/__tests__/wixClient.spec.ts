import { cart } from '@wix/ecom';
import { createClient } from '../wixClient';

describe('wixClient', () => {
  beforeEach(() => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            accessToken: 'some-accessToken',
            refreshToken: 'some-refreshToken',
          }),
      }),
    );
  });

  it('should throw when no modules pass', () => {
    expect(() => createClient({ modules: {} })).toThrowError('Missing modules');
  });

  it('should throw when called without session', async () => {
    const client = createClient({ modules: { cart } });
    await expect(() => client.cart.createCart({})).rejects.toThrow(
      'message: You must set Authorization header before triggering a call',
    );
  });

  describe('headers', () => {
    beforeEach(() => {
      // @ts-expect-error
      global.fetch = jest.fn(() =>
        Promise.resolve({
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

    it('should support setting headers', async () => {
      const token =
        'vqSVCBy6xYPLdlbEUSHvpz0Vv7iNxLJI_Enoolg4Ifs.eyJpbnN0YW5jZUlkIjoiMmViMDhmZmYtMDkwOS00YWYxLTgyMjUtYmJhOTY2NTE5OThiIiwiYXBwRGVmSWQiOiIxMzgwYjcwMy1jZTgxLWZmMDUtZjExNS0zOTU3MWQ5NGRmY2QiLCJtZXRhU2l0ZUlkIjoiNzNjYTBiYmItOGZiYi00N2Y5LTg3MjQtODIyNjczZWM4MjE2Iiwic2lnbkRhdGUiOiIyMDIyLTA4LTA4VDA3OjE1OjEyLjU0OVoiLCJ1aWQiOiJkYTMzYWM2Yy00YjRlLTRkNTUtYmEyMS1jNzg5ZTU3NTk1MTQiLCJ2ZW5kb3JQcm9kdWN0SWQiOiJzdG9yZXNfc2lsdmVyIiwiZGVtb01vZGUiOmZhbHNlLCJhaWQiOiJiYWNhODEyOS1mYzIyLTRmYTktOGFlZC0zNTI5NTIxMjUzNjIiLCJiaVRva2VuIjoiNWQ3YTg0NDQtODZiMi0wZDA4LTA1MDEtMzk4ZjE1YmQxYjlkIiwic2l0ZU93bmVySWQiOiJlNzZkNzE0NC00MjkzLTRlYWYtYThkOS0wMGMyODlmNDdiNWIiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjItMDgtMDhUMTE6MTU6MTIuNTQ5WiIsImhhc1VzZXJSb2xlIjpmYWxzZX0';

      const client = createClient({ modules: { cart } });

      await client.setHeaders({
        Authorization: token,
      });

      await client.cart.createCart({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: token }),
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
});
