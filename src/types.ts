export type RatioKey = '3:4' | '4:5' | '1:1';
export type ReviewStatus = 'unreviewed' | 'selected' | 'rejected';
export type NamingPattern = 'sequential' | 'nursery_sequential' | 'date_sequential';
export type PageId = 'dashboard' | 'nurseries' | 'inbox' | 'processing' | 'export' | 'settings';

export interface Nursery {
  id: string;
  name: string;
  hasAvatar: boolean;
  hasFrame: boolean;
}

export interface Photo {
  id: string;
  nurseryId: string;
  batchDate: string;
  fileName: string;
  hash: string;
  brightness: number;
  sharpness: number;
  status: ReviewStatus;
  addedAt: string;
}

export interface Processed {
  id: string;
  photoId: string;
  nurseryId: string;
  batchDate: string;
  createdAt: string;
}

export interface PhotoStyle {
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  sharpness: number;
}

export interface Settings {
  ratio: RatioKey;
  jpegQuality: number;
  namingPattern: NamingPattern;
  style: PhotoStyle;
}

export interface AppState {
  nurseries: Nursery[];
  photos: Photo[];
  processed: Processed[];
  settings: Settings;
}
