
export interface Photo {
  id: string;
  originalUrl: string;
  processedUrl?: string; // The filtered square image
  posterUrl?: string;    // The final generated poster with metadata
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  caption?: string;
  frames?: string[];     // For burst/gif
  processedFrames?: string[];
  locationName?: string;
  coordinates?: string;
  filter?: FilterType;
}

export type FilterType = 'HIPPO_400' | 'HIPPO_800' | 'WILLIAM_400' | 'WILLIAM_H';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export enum CameraMode {
  PHOTO = 'PHOTO',
}

export enum AppView {
  CAMERA = 'CAMERA',
  LOCAL_GALLERY = 'LOCAL_GALLERY',
  PHOTO_DETAIL = 'PHOTO_DETAIL',
}
