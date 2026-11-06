import { BLUR_LIMIT, DARK_LIMIT, duplicateMap, hashDistance } from '@/lib/image';
import type { Photo, ReviewStatus } from '@/types';

const SCENE_DISTANCE = 14;
const KEEP_PER_SCENE = 3;

export function autoReview(photos: Photo[]): Map<string, ReviewStatus> {
  const result = new Map<string, ReviewStatus>();
  const duplicates = duplicateMap(photos);
  const candidates: Photo[] = [];
  for (const p of photos) {
    if (duplicates.has(p.id) || p.brightness < DARK_LIMIT || p.sharpness < BLUR_LIMIT) {
      result.set(p.id, 'rejected');
    } else {
      candidates.push(p);
    }
  }

  const scenes: Photo[][] = [];
  const byTime = [...candidates].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  for (const p of byTime) {
    const scene = scenes.find((s) => hashDistance(s[0].hash, p.hash) <= SCENE_DISTANCE);
    if (scene) scene.push(p);
    else scenes.push([p]);
  }

  for (const scene of scenes) {
    const ranked = [...scene].sort((a, b) => b.sharpness - a.sharpness);
    ranked.forEach((p, i) => result.set(p.id, i < KEEP_PER_SCENE ? 'selected' : 'rejected'));
  }
  return result;
}
