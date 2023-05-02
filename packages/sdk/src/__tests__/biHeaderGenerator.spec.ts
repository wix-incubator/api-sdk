import { biHeaderGenerator, WixBIHeaderName } from '../bi/biHeaderGenerator';
import { PublicMetadata } from '../common';

describe('biHeaderGenerator', () => {
  const requestOptions = {
    methodFqn: 'some.method.fqn',
    entityFqdn: 'wix.test.v1.foo',
  };
  const publicMetadata: PublicMetadata = {
    PACKAGE_NAME: '@wix/some-package',
  };

  it('should generate an object with a single header', () => {
    const result = biHeaderGenerator(requestOptions, publicMetadata);

    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should generate the correct BI header name', () => {
    const result = biHeaderGenerator(requestOptions, publicMetadata);

    expect(result).toHaveProperty('x-wix-bi-gateway');
  });

  // https://www.rfc-editor.org/rfc/rfc9110.html#name-field-order
  it('should generate a valid multi value field', () => {
    const result = biHeaderGenerator(requestOptions, publicMetadata);
    const value = result[WixBIHeaderName];
    expect(value).toEqual(
      'environment=js-sdk,package-name=@wix/some-package,method-fqn=some.method.fqn,entity=wix.test.v1.foo',
    );
  });

  describe('specific BI header values', () => {
    it('should include an environment key set to an open sdk specific value even if no other values were obtained', () => {
      const result = biHeaderGenerator({}, {});
      const value = result[WixBIHeaderName];
      expect(value).toMatch(/environment=js-sdk/);
    });

    it('should include a package name key if it is specified', () => {
      const result = biHeaderGenerator(requestOptions, publicMetadata);
      const value = result[WixBIHeaderName];
      expect(value).toMatch(/package-name=@wix\/some-package/);
    });

    it('should include a method fqn key if it specified', () => {
      const result = biHeaderGenerator(requestOptions, publicMetadata);
      const value = result[WixBIHeaderName];
      expect(value).toMatch(/method-fqn=some.method.fqn/);
    });

    it('should include an entity key set if it is specified', () => {
      const result = biHeaderGenerator(requestOptions, publicMetadata);
      const value = result[WixBIHeaderName];
      expect(value).toMatch(/entity=wix.test.v1.foo/);
    });

    it('should not include a package name key if it is not specified', () => {
      const result = biHeaderGenerator(requestOptions, {});
      const value = result[WixBIHeaderName];
      expect(value).not.toMatch(/package-name=/);
    });

    it('should not include a method fqn key if it is not specified', () => {
      const result = biHeaderGenerator({}, publicMetadata);
      const value = result[WixBIHeaderName];
      expect(value).not.toMatch(/method-fqn=/);
    });

    it('should not include an entity key set if it is not specified', () => {
      const result = biHeaderGenerator({}, publicMetadata);
      const value = result[WixBIHeaderName];
      expect(value).not.toMatch(/entity=/);
    });
  });
});
