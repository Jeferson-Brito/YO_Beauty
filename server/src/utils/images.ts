import { randomUUID } from 'node:crypto';

const signatures = {
  jpg: (data: Buffer) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  png: (data: Buffer) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  gif: (data: Buffer) => data.length >= 6 && (data.subarray(0, 6).toString('ascii') === 'GIF87a' || data.subarray(0, 6).toString('ascii') === 'GIF89a'),
  webp: (data: Buffer) =>
    data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP',
} as const;

export type ImageExtension = keyof typeof signatures;

export function detectImage(data: Buffer): ImageExtension | null {
  const found = (Object.keys(signatures) as ImageExtension[]).find((kind) => signatures[kind](data));
  return found ?? null;
}

export function contentTypeOf(extension: ImageExtension): string {
  if (extension === 'jpg') return 'image/jpeg';
  return `image/${extension}`;
}

export function imageKey(folder: string, extension: ImageExtension): string {
  if (!/^[a-z0-9-]+$/.test(folder)) {
    throw new Error('Pasta de imagem inválida.');
  }
  return `${folder}/${randomUUID()}.${extension}`;
}
