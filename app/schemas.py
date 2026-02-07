from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


HourBucket = Literal["dawn", "morning", "afternoon", "evening"]


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


class SeedResult(BaseModel):
    inserted: int


class PhotoUploadOut(BaseModel):
    photo_url: str
    key: str
    content_type: str
    size_bytes: int


class PhotoDeleteIn(BaseModel):
    key: str = Field(min_length=1, max_length=2048)


class PhotoDeleteOut(BaseModel):
    deleted: bool
