import JSZip from 'jszip';
import { blobs, keys } from '@/lib/db';
import type { AppState, NamingPattern } from '@/types';

export interface ExportNursery {
  folder: string;
  name: string;
  images: { key: string; date: string }[];
}

export function safeName(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
  return cleaned || fallback;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function collectExport(state: AppState, nurseryId?: string): ExportNursery[] {
  return state.nurseries
    .filter((n) => !nurseryId || n.id === nurseryId)
    .map((nursery) => {
      const name = safeName(nursery.name, 'Nursery');
      const images = state.processed
        .filter((p) => p.nurseryId === nursery.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((p) => ({ key: keys.out(p.id), date: p.batchDate }));
      return { folder: `Nursery_${name}`, name, images };
    })
    .filter((nursery) => nursery.images.length > 0);
}

function imageName(pattern: NamingPattern, index: number, nurseryName: string, date: string): string {
  const nn = pad(index);
  if (pattern === 'nursery_sequential') return `${nurseryName}_${nn}.jpg`;
  if (pattern === 'date_sequential') return `${date}_${nn}.jpg`;
  return `image_${nn}.jpg`;
}

export async function buildZip(
  nurseries: ExportNursery[],
  pattern: NamingPattern,
  onProgress: (percent: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('NurseryFlow_Output')!;
  const total = Math.max(
    1,
    nurseries.reduce((sum, n) => sum + n.images.length, 0),
  );
  let done = 0;
  for (const nursery of nurseries) {
    const folder = root.folder(nursery.folder)!;
    for (const [index, image] of nursery.images.entries()) {
      const blob = await blobs.get(image.key);
      if (!blob) throw new Error('missing image');
      folder.file(imageName(pattern, index + 1, nursery.name, image.date), blob);
      done++;
      onProgress(Math.round((done / total) * 90));
    }
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) =>
    onProgress(90 + Math.round(meta.percent / 10)),
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
