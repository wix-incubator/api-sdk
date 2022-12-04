import { media } from '../wixMedia';

describe('media utils', () => {
  it('should return url', () => {
    const obj = media.getRawImageUrl(
      'image://v1/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg#originWidth=1000&originHeight=1000',
    );
    expect(obj.url).toEqual(
      'https://static.wixstatic.com/media/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg',
    );
  });

  it('should return fill image', () => {
    const url = media.getScaleToFillImageUrl(
      'image://v1/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg#originWidth=1000&originHeight=1000',
      50,
      50,
      { quality: 50 },
    );
    expect(url).toEqual(
      'https://static.wixstatic.com/media/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg/v1/fill/w_50,h_50,al_c,q_50,usm_0.66_1.00_0.01,enc_auto/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg',
    );
  });

  it('should return fit image', () => {
    const url = media.getScaleToFitImageURL(
      'image://v1/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg#originWidth=1000&originHeight=1000',
      50,
      50,
      { quality: 50 },
    );
    expect(url).toEqual(
      'https://static.wixstatic.com/media/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg/v1/fill/w_50,h_50,al_c,q_50,usm_0.66_1.00_0.01,enc_auto/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg',
    );
  });

  it('should return crop image', () => {
    const url = media.getCropImageURL(
      'image://v1/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg#originWidth=1000&originHeight=1000',
      450,
      450,
      50,
      50,
      100,
      100,
      { quality: 50 },
    );
    expect(url).toEqual(
      'https://static.wixstatic.com/media/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg/v1/crop/x_450,y_450,w_50,h_50/fill/w_70,h_70,al_c,lg_1,q_50,enc_auto/a9ff3b_9928686dcfa740bd802821d0b6f4ac03.jpg',
    );
  });
});
