/**
 * The image a person uploads (a voucher, a document) is reduced in the browser before it leaves
 * (TAR-315, decision of the person in charge, 2026-11-08): at most 2000 px on the long side and
 * JPEG at quality 85, and only that version is kept. A phone photo of 3 MB becomes a few hundred
 * KB and a voucher stays legible when zoomed. PDFs and anything that is not a JPG or PNG go as
 * they are, and so does an image that is already small or that would not get smaller.
 */
export const MAX_SIDE = 2000;
export const JPEG_QUALITY = 0.85;
/** An image under this size that already fits is left alone: recompressing it only loses detail. */
const LEAVE_ALONE_BYTES = 400 * 1024;

const SHRINKABLE = ['image/jpeg', 'image/png'];

/** The size that fits `max` on its long side, keeping the proportion (never larger). */
export function fitWithin(width: number, height: number, max: number): [number, number] {
  const longSide = Math.max(width, height);
  if (longSide <= max) return [width, height];
  const scale = max / longSide;
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

/** The name of the reduced file: the same one with the extension of what it now is. */
export function jpegName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, '')}.jpg`;
}

function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
}

async function reduce(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const [width, height] = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const fits = width === bitmap.width && height === bitmap.height;
    if (fits && file.size <= LEAVE_ALONE_BYTES) return file;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) return file;
    // A PNG may be transparent: JPEG has no alpha, so it goes on white paper.
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await encode(canvas);
    if (blob === null || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/** The file to upload: the reduced image, or the same file when it is not one or cannot be read. */
export async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE.includes(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    return await reduce(file);
  } catch {
    return file;
  }
}
