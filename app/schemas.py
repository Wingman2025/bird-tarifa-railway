from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


HourBucket = Literal["dawn", "morning", "afternoon", "evening"]
PredictionConfidence = Literal["high", "medium", "low"]
ZoneKind = Literal["geo", "hotspot"]


class SightingCreate(BaseModel):
    zone: str = Field(min_length=2, max_length=120)
    species_guess: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    photo_url: str | None = Field(default=None, max_length=1024)
    observed_at: datetime | None = None


class SightingOut(BaseModel):
    id: int
    created_at: datetime
    observed_at: datetime
    zone: str
    species_guess: str | None
    notes: str | None
    photo_url: str | None

    class Config:
        from_attributes = True


class PredictionRuleCreate(BaseModel):
    zone: str = Field(min_length=2, max_length=120)
    month: int = Field(ge=1, le=12)
    hour_bucket: HourBucket
    species: str = Field(min_length=2, max_length=120)
    weight: int = Field(default=1, ge=0, le=999)


class PredictionOut(BaseModel):
    species: str
    score: int
    reason: str
    confidence: PredictionConfidence = "high"
    fallback_used: bool = False
    observations_count: int | None = None
    last_seen_days_ago: int | None = None


class SeedResult(BaseModel):
    inserted: int


class ZoneOut(BaseModel):
    id: str
    name: str
    kind: ZoneKind


class BirdInfoOut(BaseModel):
    species: str
    title: str | None = None
    extract: str | None = None
    photo_url: str | None = None
    page_url: str | None = None
    source: str | None = None


class PhotoUploadOut(BaseModel):
    photo_url: str
    key: str
    content_type: str
    size_bytes: int


class PhotoDeleteIn(BaseModel):
    key: str = Field(min_length=1, max_length=2048)


class PhotoDeleteOut(BaseModel):
    deleted: bool
