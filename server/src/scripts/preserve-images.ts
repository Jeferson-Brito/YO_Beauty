import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/prisma';
import { databaseStorage, isImageKey } from '../storage/database-storage';
import { contentTypeOf, detectImage } from '../utils/images';

// Executar antes de substituir o deploy antigo. Preserva as URLs existentes.
async function main() {
  const [products, categories, banners, sections, settings] = await Promise.all([
    prisma.productImage.findMany({ select: { imageUrl: true } }),
    prisma.category.findMany({ select: { imageUrl: true } }),
    prisma.storeBanner.findMany({ select: { imageUrl: true } }),
    prisma.homeSection.findMany({ select: { bannerImageUrl: true } }),
    prisma.storeSettings.findMany({ select: { logoUrl: true } }),
  ]);
  const urls = new Set([
    ...products.map(row => row.imageUrl), ...categories.map(row => row.imageUrl),
    ...banners.map(row => row.imageUrl), ...sections.map(row => row.bannerImageUrl), ...settings.map(row => row.logoUrl),
  ].filter((url): url is string => !!url?.startsWith('/uploads/')));
  const origin = process.env.IMAGE_SOURCE_ORIGIN;
  if (origin && !/^https?:$/.test(new URL(origin).protocol)) throw new Error('Origem inválida.');
  let saved = 0;
  let alreadyStored = 0;
  const unavailable: string[] = [];
  for (const url of urls) {
    const key = url.slice('/uploads/'.length);
    if (!isImageKey(key)) { unavailable.push(url); continue; }
    if (await prisma.storedImage.findUnique({ where: { key }, select: { key: true } })) { alreadyStored++; continue; }
    let bytes: Buffer | undefined;
    const roots = [process.env.IMAGE_BACKUP_DIR, path.resolve(__dirname, '../../uploads')].filter((root): root is string => !!root);
    for (const root of roots) {
      bytes = await readFile(path.resolve(root, key)).catch(() => undefined);
      if (bytes && detectImage(bytes)) break;
      bytes = undefined;
    }
    if (!bytes && origin) {
      try {
        const response = await fetch(new URL(url, origin), { redirect: 'error', signal: AbortSignal.timeout(30000) });
        if (response.ok && Number(response.headers.get('content-length') || 0) <= 4 * 1024 * 1024) bytes = Buffer.from(await response.arrayBuffer());
      } catch { /* Relatório permite recuperar os arquivos restantes sem apagar registros. */ }
    }
    const extension = bytes && bytes.length <= 4 * 1024 * 1024 ? detectImage(bytes) : null;
    if (!bytes || !extension) { unavailable.push(url); continue; }
    await databaseStorage.save({ key, data: bytes, contentType: contentTypeOf(extension) });
    saved++;
  }
  console.log(JSON.stringify({ referenced: urls.size, saved, alreadyStored, unavailable }, null, 2));
  if (unavailable.length && process.argv.includes('--require-all')) process.exitCode = 1;
}

main().catch(() => { console.error('Falha ao preservar imagens. Confira a conexão e as migrations.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
