
import { parseResponseJson } from '@/lib/api';

export interface ChannelHealth {
  valid: boolean;
  httpStatus?: number;
  contentType?: string;
  errorMessage?: string;
  isGeoBlocked?: boolean;
  requiresAuth?: boolean;
  type?: string;
  lastChecked: string;
}

export const analyzeChannelHealth = async (channel: any): Promise<ChannelHealth> => {
    try {
        const response = await fetch(`/api/stream-health?url=${encodeURIComponent(channel.url)}&type=${channel.stream_type || 'unknown'}`);
        return await parseResponseJson(response);
    } catch (e: any) {
        return { valid: false, errorMessage: e.message, lastChecked: new Date().toISOString() };
    }
}
