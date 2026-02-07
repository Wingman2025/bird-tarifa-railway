export interface ZoneOut {
  id: string;
  name: string;
  kind: 'geo' | 'hotspot';
}

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
  observations_count: number | null;
  last_seen_days_ago: number | null;
}

export interface PredictionQuery {
  zone: string;
  zone_id?: string | null;
  month: number;
  limit?: number;
}

export interface BirdInfoOut {
  species: string;
  title: string | null;
  extract: string | null;
  photo_url: string | null;
  page_url: string | null;
  source: string | null;
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
