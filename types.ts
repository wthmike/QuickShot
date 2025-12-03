export interface Photo {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  caption?: string;
  frames?: string[];
  processedFrames?: string[];
}

export enum CameraMode {
  PHOTO = 'PHOTO',
}

export enum AppView {
  CAMERA = 'CAMERA',
  GALLERY = 'GALLERY',
  PHOTO_DETAIL = 'PHOTO_DETAIL',
}