import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { WixProvider, useWix, useWixModules } from '../index';
import { AuthenticationStrategy, WixClient, HostModule } from '@wix/api-client';
import { currentCart } from '@wix/ecom';

const hostModule: HostModule<
  {
    aHostFunction: (a: number) => number;
  },
  {
    someFunction: (a: number) => number;
  }
> = {
  __type: 'host',
  create: (host) => ({
    aHostFunction: (a: number) => host.someFunction(a),
  }),
};

const UserComponent = (props: { aNumber?: number }) => {
  const sdk = useWix<
    WixClient<{
      currentCart: typeof currentCart;
      hostModule: typeof hostModule;
    }>
  >();
  const [cart, setCart] = React.useState<currentCart.Cart>(null);

  React.useEffect(() => {
    sdk.currentCart.getCurrentCart().then((aCart) => setCart(aCart));
  }, [sdk]);

  return (
    <>
      {!cart ? null : <div data-testid="cart-id">{cart._id}</div>}
      {!props.aNumber ? null : (
        <div data-testid="host-result">
          {sdk.hostModule.aHostFunction(props.aNumber)}
        </div>
      )}
    </>
  );
};

it('should provide an initialize SDK with modules and auth', async () => {
  // @ts-expect-error
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 200,
      json: () =>
        Promise.resolve({
          cart: {
            id: 'the-cart-id',
            lineItems: [],
          },
        }),
    }),
  );

  const auth: AuthenticationStrategy = {
    getAuthHeaders: async () => ({
      headers: {
        Authorization: 'Bearer 123',
      },
    }),
  };

  render(
    <WixProvider auth={auth} modules={{ currentCart }}>
      <UserComponent />
    </WixProvider>,
  );

  await screen.findByTestId('cart-id');
  expect(screen.getByTestId('cart-id').textContent).toEqual('the-cart-id');

  expect(global.fetch).toHaveBeenCalledWith(
    'https://www.wixapis.com/ecom/v1/carts/current',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer 123',
      }),
    }),
  );
});

it('should provide an initialize SDK with host modules and host auth', async () => {
  // @ts-expect-error
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 200,
      json: () =>
        Promise.resolve({
          cart: {
            id: 'the-cart-id',
            lineItems: [],
          },
        }),
    }),
  );

  const aHost = {
    getAuth: () => `the-auth-token`,
    someFunction: (a) => a + 1,
  };

  const auth: AuthenticationStrategy = {
    getAuthHeaders: async (host?: typeof aHost) => {
      return {
        headers: {
          Authorization: host ? host.getAuth() : undefined,
        },
      };
    },
  };

  render(
    <WixProvider auth={auth} modules={{ currentCart, hostModule }} host={aHost}>
      <UserComponent aNumber={4} />
    </WixProvider>,
  );

  await screen.findByTestId('cart-id');
  expect(screen.getByTestId('cart-id').textContent).toEqual('the-cart-id');

  await screen.findByTestId('host-result');
  expect(screen.getByTestId('host-result').textContent).toEqual('5');

  expect(global.fetch).toHaveBeenCalledWith(
    'https://www.wixapis.com/ecom/v1/carts/current',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'the-auth-token',
      }),
    }),
  );
});

describe('useSDKModules', () => {
  it('should initialize a direct rest function descriptor', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            cart: {
              id: 'the-cart-id',
              lineItems: [],
            },
          }),
      }),
    );

    const UseSDKModulesComponent = () => {
      const theGetCurrentCart = useWixModules(currentCart.getCurrentCart);
      const [cart, setCart] = React.useState<currentCart.Cart>(null);

      React.useEffect(() => {
        theGetCurrentCart().then((aCart) => setCart(aCart));
      }, [theGetCurrentCart]);

      return <>{!cart ? null : <div data-testid="cart-id">{cart._id}</div>}</>;
    };

    render(
      <WixProvider>
        <UseSDKModulesComponent />
      </WixProvider>,
    );

    await screen.findByTestId('cart-id');
    expect(screen.getByTestId('cart-id').textContent).toEqual('the-cart-id');
  });

  it('should initialize a direct host module descriptor', async () => {
    const aHost = {
      aHostFunction: (a: number) => a + 1,
    };

    const anotherHostModule: HostModule<
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

    const UseSDKModulesComponent = (props: { aNumber: number }) => {
      const theHostModule = useWixModules(anotherHostModule);

      return (
        <>
          {!props.aNumber ? null : (
            <div data-testid="host-result">
              {theHostModule.aHostFunction(props.aNumber)}
            </div>
          )}
        </>
      );
    };

    render(
      <WixProvider host={aHost}>
        <UseSDKModulesComponent aNumber={4} />
      </WixProvider>,
    );

    await screen.findByTestId('host-result');
    expect(screen.getByTestId('host-result').textContent).toEqual('5');
  });

  it('should initialize a nested modules descriptors', async () => {
    // @ts-expect-error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            cart: {
              id: 'the-cart-id',
              lineItems: [],
            },
          }),
      }),
    );

    const aHost = {
      aHostFunction: (a: number) => a + 1,
    };

    const anotherHostModule: HostModule<
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

    const UseSDKModulesComponent = (props: { aNumber: number }) => {
      const { anotherHostModule: theHostModule, currentCart: theCurrentCart } =
        useWixModules({
          anotherHostModule,
          currentCart,
        });

      const [cart, setCart] = React.useState<currentCart.Cart>(null);

      React.useEffect(() => {
        theCurrentCart.getCurrentCart().then((aCart) => setCart(aCart));
      }, [theCurrentCart]);

      return (
        <>
          {!cart ? null : <div data-testid="cart-id">{cart._id}</div>}
          {!props.aNumber ? null : (
            <div data-testid="host-result">
              {theHostModule.aHostFunction(props.aNumber)}
            </div>
          )}
        </>
      );
    };

    render(
      <WixProvider host={aHost}>
        <UseSDKModulesComponent aNumber={4} />
      </WixProvider>,
    );

    await screen.findByTestId('cart-id');
    expect(screen.getByTestId('cart-id').textContent).toEqual('the-cart-id');

    await screen.findByTestId('host-result');
    expect(screen.getByTestId('host-result').textContent).toEqual('5');
  });
});
