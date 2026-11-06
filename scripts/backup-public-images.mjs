import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.IMAGE_SOURCE_ORIGIN || 'https://yobeauty.brisoft.com.br';
const destination = path.resolve('.local/image-backup');
const urls = new Set();
function collect(value) {
  if (typeof value === 'string' && /^\/uploads\/[a-z0-9-]+\/[a-z0-9.-]+$/i.test(value)) urls.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
async function get(route) {
  const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${route}`);
  return response.json();
}
collect(await get('/api/home'));
for (let page = 1; ; page++) {
  const listing = await get(`/api/products?pageSize=48&page=${page}`);
  for (const product of listing.data) collect(await get(`/api/products/${product.slug}`));
  if (page >= listing.meta.pageCount) break;
}
const report = [];
for (const url of urls) {
  const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    report.push({ url, saved: false, status: response.status });
    continue;
  }
  const target = path.join(destination, url.slice('/uploads/'.length));
  await mkdir(path.dirname(target), { recursive: true });
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(target, bytes);
  report.push({ url, saved: true, bytes: bytes.length });
}
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ found: report.length, saved: report.filter(row => row.saved).length, unavailable: report.filter(row => !row.saved).map(row => row.url) }));
