
export interface Photo {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  caption?: string;
  frames?: string[];
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
  followers: number;
  following: number;
}

export interface Post {
  id: string;
  userId: string;
  user: User; // In Supabase this would be a join
  mainImageUrl: string;
  frameUrls: string[]; // For GIF playback
  caption: string;
  locationName: string;
  coordinates?: string;
  timestamp: number;
  likes: number;
  likedByMe: boolean;
  logIndex: number; // Sequential number for the user's log
  filter?: FilterType;
}

export enum CameraMode {
  PHOTO = 'PHOTO',
}

export enum AppView {
  FEED = 'FEED',
  CAMERA = 'CAMERA',
  PROFILE = 'PROFILE',
  LOCAL_GALLERY = 'LOCAL_GALLERY', // Your private archive
  PHOTO_DETAIL = 'PHOTO_DETAIL',
  ONBOARDING = 'ONBOARDING',
}