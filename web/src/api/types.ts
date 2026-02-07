export type HourBucket = 'dawn' | 'morning' | 'afternoon' | 'evening';

export interface SightingCreateInput {
  zone: string;
  species_guess?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  observed_at?: string | null;
}

export interface SightingOut {
  id: number;
  created_at: string;
  observed_at: string;
  zone: string;
  species_guess: string | null;
  notes: string | null;
  photo_url: string | null;
}

export interface PredictionOut {
  species: string;
  score: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  fallback_used: boolean;
}

export interface PredictionQuery {
  zone: string;
  month: number;
  hour_bucket: HourBucket;
  limit?: number;
}

export interface PhotoUploadOut {
  photo_url: string;
  key: string;
  content_type: string;
  size_bytes: number;
}

export interface SeedResult {
  inserted: number;
}
