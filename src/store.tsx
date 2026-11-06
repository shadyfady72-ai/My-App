import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { blobs, keys } from '@/lib/db';
import type { AppState, Nursery, Photo, Processed, ReviewStatus, Settings } from '@/types';

const STORAGE_KEY = 'nurseryflow:state:v1';

export const DEFAULT_SETTINGS: Settings = {
  ratio: '3:4',
  jpegQuality: 0.92,
  namingPattern: 'sequential',
  style: {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    sharpness: 0,
  },
};

const DEMO_NAMES = [
  'حضانة براعم النور',
  'حضانة النجوم الصغيرة',
  'حضانة زهرة الربيع',
  'حضانة أطفال المستقبل',
  'حضانة لؤلؤة الخليج',
  'حضانة واحة الأمل',
  'حضانة شمس الطفولة',
  'حضانة قمر الحكايات',
  'حضانة الأوائل',
  'حضانة ورد الصباح',
];

export function demoState(): AppState {
  return {
    nurseries: DEMO_NAMES.map((name) => ({
      id: crypto.randomUUID(),
      name,
      hasAvatar: false,
      hasFrame: false,
    })),
    photos: [],
    processed: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.nurseries)) return {
        ...parsed,
        settings: {
          ...DEFAULT_SETTINGS,
          ...parsed.settings,
          style: { ...DEFAULT_SETTINGS.style, ...parsed.settings?.style },
        },
      };
    }
  } catch {
    return demoState();
  }
  return demoState();
}

export type Action =
  | { type: 'nursery/save'; nursery: Nursery }
  | { type: 'nursery/delete'; id: string }
  | { type: 'photos/add'; photos: Photo[] }
  | { type: 'photos/remove'; ids: string[] }
  | { type: 'photos/status'; ids: string[]; status: ReviewStatus }
  | { type: 'processed/add'; items: Processed[] }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/set'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'nursery/save': {
      const exists = state.nurseries.some((n) => n.id === action.nursery.id);
      return {
        ...state,
        nurseries: exists
          ? state.nurseries.map((n) => (n.id === action.nursery.id ? action.nursery : n))
          : [...state.nurseries, action.nursery],
      };
    }
    case 'nursery/delete': {
      const id = action.id;
      return {
        ...state,
        nurseries: state.nurseries.filter((n) => n.id !== id),
        photos: state.photos.filter((p) => p.nurseryId !== id),
        processed: state.processed.filter((p) => p.nurseryId !== id),
      };
    }
    case 'photos/add':
      return { ...state, photos: [...state.photos, ...action.photos] };
    case 'photos/remove': {
      const removed = new Set(action.ids);
      return {
        ...state,
        photos: state.photos.filter((p) => !removed.has(p.id)),
        processed: state.processed.filter((p) => !removed.has(p.photoId)),
      };
    }
    case 'photos/status': {
      const ids = new Set(action.ids);
      return {
        ...state,
        photos: state.photos.map((p) => (ids.has(p.id) ? { ...p, status: action.status } : p)),
      };
    }
    case 'processed/add':
      return { ...state, processed: [...state.processed, ...action.items] };
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'state/set':
      return action.state;
  }
}

function createActions(state: AppState, dispatch: Dispatch<Action>) {
  return {
    async saveNursery(nursery: Nursery, avatar: Blob | null | undefined, frame: Blob | null | undefined) {
      let { hasAvatar, hasFrame } = nursery;
      if (avatar) {
        await blobs.put(keys.avatar(nursery.id), avatar);
        hasAvatar = true;
      } else if (avatar === null) {
        await blobs.remove([keys.avatar(nursery.id)]);
        hasAvatar = false;
      }
      if (frame) {
        await blobs.put(keys.frame(nursery.id), frame);
        hasFrame = true;
      } else if (frame === null) {
        await blobs.remove([keys.frame(nursery.id)]);
        hasFrame = false;
      }
      dispatch({ type: 'nursery/save', nursery: { ...nursery, hasAvatar, hasFrame } });
    },
    async deleteNursery(id: string) {
      const photoIds = state.photos.filter((p) => p.nurseryId === id).map((p) => p.id);
      const outIds = state.processed.filter((p) => p.nurseryId === id).map((p) => p.id);
      await blobs.remove([
        keys.avatar(id),
        keys.frame(id),
        ...photoIds.flatMap((p) => [keys.original(p), keys.thumb(p)]),
        ...outIds.map(keys.out),
      ]);
      dispatch({ type: 'nursery/delete', id });
    },
    async removePhotos(ids: string[]) {
      const set = new Set(ids);
      const outIds = state.processed.filter((p) => set.has(p.photoId)).map((p) => p.id);
      await blobs.remove([
        ...ids.flatMap((p) => [keys.original(p), keys.thumb(p)]),
        ...outIds.map(keys.out),
      ]);
      dispatch({ type: 'photos/remove', ids });
    },
    async clearPhotoData() {
      await blobs.remove([
        ...state.photos.flatMap((p) => [keys.original(p.id), keys.thumb(p.id)]),
        ...state.processed.map((p) => keys.out(p.id)),
      ]);
      dispatch({ type: 'state/set', state: { ...state, photos: [], processed: [] } });
    },
  };
}

export type Store = {
  state: AppState;
  dispatch: Dispatch<Action>;
  actions: ReturnType<typeof createActions>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      return;
    }
  }, [state]);

  const actions = useMemo(() => createActions(state, dispatch), [state]);
  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
