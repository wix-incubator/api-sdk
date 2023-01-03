import { sdk, ImageTransformOptions } from '@wix/image-kit';
import { parse } from 'querystring';

const URL_HASH_PREFIX = '#';
const WIX_PROTOCOL = 'wix:';
const WIX_IMAGE = 'image';

function getScaledToFillImageUrl(
  wixMediaIdentifier: string,
  targetWidth: number,
  targetHeight: number,
  options: ImageTransformOptions,
) {
  const img = getImageUrl(wixMediaIdentifier);

  return sdk.getScaleToFillImageURL(
    img.id,
    img.height,
    img.width,
    targetWidth,
    targetHeight,
    options,
  );
}

function getScaledToFitImageUrl(
  wixMediaIdentifier: string,
  targetWidth: number,
  targetHeight: number,
  options: ImageTransformOptions,
) {
  const img = getImageUrl(wixMediaIdentifier);

  return sdk.getScaleToFitImageURL(
    img.id,
    img.height,
    img.width,
    targetWidth,
    targetHeight,
    options,
  );
}

function getCroppedImageUrl(
  wixMediaIdentifier: string,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  targetWidth: number,
  targetHeight: number,
  options?: ImageTransformOptions,
) {
  const img = getImageUrl(wixMediaIdentifier);

  return sdk.getCropImageURL(
    img.id,
    img.height,
    img.width,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    targetWidth,
    targetHeight,
    options,
  );
}

function getImageUrl(val: string) {
  const alignedImage = alignIfLegacy(val, WIX_IMAGE);

  const { hash, pathname } = new URL(alignedImage);

  const { originHeight: height, originWidth: width } = parse(
    hash.replace(URL_HASH_PREFIX, ''),
  );
  const [id, filenameOrAltText] = pathname
    .replace(`${WIX_IMAGE}://v1/`, '')
    .split('/');

  const decodedFilenameOrAltText = decodeText(filenameOrAltText);

  const res = {
    id,
    url: `https://static.wixstatic.com/media/${id}`,
    height: Number(height),
    width: Number(width),
  };

  if (!decodedFilenameOrAltText) {
    return res;
  }

  return {
    ...res,
    altText: decodedFilenameOrAltText,
    filename: decodedFilenameOrAltText,
  };
}

export function decodeText(s: string) {
  if (!s) {
    return s;
  }

  return decodeURIComponent(s);
}

function alignIfLegacy(url: string, type: string): string {
  const { protocol } = new URL(url);

  return protocol === `${type}:` ? `${WIX_PROTOCOL}${url}` : url;
}

export const media = {
  getCroppedImageUrl,
  getScaledToFillImageUrl,
  getScaledToFitImageUrl,
  getImageUrl,
};
