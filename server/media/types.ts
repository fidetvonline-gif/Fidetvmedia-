export type MediaType = 'video' | 'audio' | 'image' | 'file';

export interface MediaMetadata {
  type: MediaType;
  mimeType: string;
  filename: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  thumbnail?: string;
  downloadUrl: string;
  sourceUrl: string;
  platform?: string;
  resolution?: string;
}

export interface AnalyzeResult {
  success: boolean;
  media?: MediaMetadata;
  error?: string;
}
