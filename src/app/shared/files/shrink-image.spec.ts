import { fitWithin, jpegName, MAX_SIDE, shrinkImage } from './shrink-image';

function file(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('shrinkImage (TAR-315)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fits the long side in 2000 px keeping the proportion, and never enlarges', () => {
    expect(fitWithin(4000, 3000, MAX_SIDE)).toEqual([2000, 1500]);
    expect(fitWithin(1500, 3000, MAX_SIDE)).toEqual([1000, 2000]);
    expect(fitWithin(1200, 800, MAX_SIDE)).toEqual([1200, 800]);
  });

  it('names the reduced file with the extension of a JPEG', () => {
    expect(jpegName('captura.png')).toBe('captura.jpg');
    expect(jpegName('foto.del.voucher.jpeg')).toBe('foto.del.voucher.jpg');
    expect(jpegName('sin-extension')).toBe('sin-extension.jpg');
  });

  it('leaves a PDF and any other type as it is', async () => {
    const pdf = file('voucher.pdf', 'application/pdf', 3_000_000);
    expect(await shrinkImage(pdf)).toBe(pdf);
    const webp = file('x.webp', 'image/webp', 3_000_000);
    expect(await shrinkImage(webp)).toBe(webp);
  });

  it('leaves the file as it is when the browser cannot decode images', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const photo = file('foto.jpg', 'image/jpeg', 3_000_000);
    expect(await shrinkImage(photo)).toBe(photo);
  });

  it('leaves the file as it is when it cannot be read', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('corrupt')));
    const photo = file('foto.jpg', 'image/jpeg', 3_000_000);
    expect(await shrinkImage(photo)).toBe(photo);
  });

  describe('with a decoded image', () => {
    function stub(width: number, height: number, reducedBytes: number) {
      const close = vi.fn();
      vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width, height, close }));
      const drawn: number[][] = [];
      const context = {
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: (_: unknown, x: number, y: number, w: number, h: number) =>
          drawn.push([x, y, w, h]),
      };
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob: (done: (blob: Blob | null) => void) => {
          done(new Blob([new Uint8Array(reducedBytes)], { type: 'image/jpeg' }));
        },
      };
      vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
      return { canvas, drawn, close };
    }

    it('reduces a large photo to 2000 px as a JPEG with the new name', async () => {
      const { canvas, drawn, close } = stub(4000, 3000, 350_000);
      const result = await shrinkImage(file('captura.png', 'image/png', 3_000_000));

      expect([canvas.width, canvas.height]).toEqual([2000, 1500]);
      expect(drawn).toEqual([[0, 0, 2000, 1500]]);
      expect(result.name).toBe('captura.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBe(350_000);
      expect(close).toHaveBeenCalled();
    });

    it('keeps an image that already fits and is small', async () => {
      stub(1200, 800, 100_000);
      const small = file('voucher.jpg', 'image/jpeg', 200_000);
      expect(await shrinkImage(small)).toBe(small);
    });

    it('keeps the original when the reduced one is not smaller', async () => {
      stub(4000, 3000, 3_500_000);
      const photo = file('foto.jpg', 'image/jpeg', 3_000_000);
      expect(await shrinkImage(photo)).toBe(photo);
    });
  });
});
