import { apiRequest } from './http';
import type {
  BirdInfoOut,
  PhotoUploadOut,
  PredictionOut,
  PredictionQuery,
  SeedResult,
  SightingCreateInput,
  SightingOut,
  ZoneOut,
} from './types';

export function healthCheck() {
  return apiRequest<{ status: string; env: string }>('/health', {
    method: 'GET',
  });
}

export function listSightings(limit = 50) {
  return apiRequest<SightingOut[]>(
    '/sightings',
    { method: 'GET' },
    { limit },
  );
}

export function listZones() {
  return apiRequest<ZoneOut[]>('/zones', { method: 'GET' });
}

export function createSighting(payload: SightingCreateInput) {
  return apiRequest<SightingOut>('/sightings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPredictions(query: PredictionQuery) {
  return apiRequest<PredictionOut[]>(
    '/predictions',
    { method: 'GET' },
    {
      zone: query.zone,
      zone_id: query.zone_id ?? null,
      month: query.month,
      limit: query.limit ?? 10,
    },
  );
}

export function getBirdInfo(species: string) {
  return apiRequest<BirdInfoOut>(
    '/birds/info',
    { method: 'GET' },
    { species },
  );
}

export function uploadPhoto(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<PhotoUploadOut>('/uploads/photo', {
    method: 'POST',
    body: formData,
  });
}

export function deletePhoto(key: string) {
  return apiRequest<{ deleted: boolean }>('/uploads/photo', {
    method: 'DELETE',
    body: JSON.stringify({ key }),
  });
}

export function seedPredictionRules() {
  return apiRequest<SeedResult>('/prediction-rules/seed', {
    method: 'POST',
  });
}
