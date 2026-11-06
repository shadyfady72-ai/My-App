import { useEffect, useRef, useState } from 'react';
import { blobs, keys } from '@/lib/db';
import { renderOutput } from '@/lib/image';
import { useStore } from '@/store';
import type { Photo, Processed } from '@/types';

const FLUSH_EVERY = 5;

export function AutoProcessor() {
  const { state, dispatch } = useStore();
  const busy = useRef(false);
  const failed = useRef(new Set<string>());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (busy.current) return;
    const done = new Set(state.processed.map((p) => p.photoId));
    const jobs = state.photos
      .filter((p: Photo) => p.status === 'selected' && !done.has(p.id) && !failed.current.has(p.id))
      .flatMap((photo) => {
        const nursery = state.nurseries.find((n) => n.id === photo.nurseryId);
        return nursery?.hasFrame ? [{ photo, nursery }] : [];
      });
    if (jobs.length === 0) return;

    busy.current = true;
    (async () => {
      const frames = new Map<string, ImageBitmap>();
      let pending: Processed[] = [];
      const flush = () => {
        if (pending.length) dispatch({ type: 'processed/add', items: pending });
        pending = [];
      };
      try {
        for (const { photo, nursery } of jobs) {
          try {
            let frame = frames.get(nursery.id);
            if (!frame) {
              const frameBlob = await blobs.get(keys.frame(nursery.id));
              if (!frameBlob) throw new Error('missing frame');
              frame = await createImageBitmap(frameBlob);
              frames.set(nursery.id, frame);
            }
            const original = await blobs.get(keys.original(photo.id));
            if (!original) throw new Error('missing original');
            const bmp = await createImageBitmap(original);
            const image = await renderOutput(
              bmp,
              frame,
              { zoom: 1, offsetX: 0, offsetY: 0, brightness: 1, contrast: 1, saturation: 1, shadows: 1, highlights: 1 },
              state.settings.ratio,
              state.settings.jpegQuality,
              state.settings.style,
            );
            bmp.close();
            const id = crypto.randomUUID();
            await blobs.put(keys.out(id), image);
            pending.push({
              id,
              photoId: photo.id,
              nurseryId: nursery.id,
              batchDate: photo.batchDate,
              createdAt: new Date().toISOString(),
            });
            if (pending.length >= FLUSH_EVERY) flush();
          } catch {
            failed.current.add(photo.id);
          }
        }
      } finally {
        flush();
        frames.forEach((frame) => frame.close());
      }
    })().finally(() => {
      busy.current = false;
      setTick((t) => t + 1);
    });
  }, [state.photos, state.processed, state.nurseries, state.settings.jpegQuality, state.settings.style, dispatch, tick]);

  return null;
}
