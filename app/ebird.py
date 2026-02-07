from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx

from .config import get_settings


EBIRD_BASE_URL = "https://api.ebird.org/v2"


@dataclass(frozen=True)
class EbirdObservation:
    common_name: str
    observed_at: datetime | None
    observed_has_time: bool
    raw_observed_at: str


@dataclass(frozen=True)
class EbirdHotspot:
    id: str
    name: str
    lat: float
    lng: float


def _parse_obs_dt(value: str) -> tuple[datetime | None, bool]:
    value = value.strip()
    for fmt, has_time in (("%Y-%m-%d %H:%M", True), ("%Y-%m-%d", False)):
        try:
            return datetime.strptime(value, fmt), has_time
        except ValueError:
            continue
    return None, False


def _hour_bucket_for_hour(hour: int) -> str:
    if 5 <= hour < 8:
        return "dawn"
    if 8 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    return "evening"


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # Good enough for sorting hotspots by proximity.
    radius_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    lat1_r = radians(lat1)
    lat2_r = radians(lat2)

    a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lng / 2) ** 2
    return 2 * radius_km * asin(sqrt(a))


def fetch_recent_geo_observations(
    *,
    lat: float,
    lng: float,
    dist_km: int,
    back_days: int,
    max_results: int,
    timeout_s: float = 12.0,
) -> list[EbirdObservation]:
    settings = get_settings()
    if not settings.ebird_api_key:
        raise RuntimeError("Missing EBIRD_API_KEY.")

    url = f"{EBIRD_BASE_URL}/data/obs/geo/recent"
    headers = {"X-eBirdApiToken": settings.ebird_api_key}
    params = {
        "lat": lat,
        "lng": lng,
        "dist": dist_km,
        "back": back_days,
        "maxResults": max_results,
    }

    with httpx.Client(timeout=timeout_s) as client:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        payload: list[dict[str, Any]] = response.json()

    observations: list[EbirdObservation] = []
    for item in payload:
        common_name = str(item.get("comName") or "").strip()
        if not common_name:
            continue
        raw_obs_dt = str(item.get("obsDt") or "").strip()
        dt, has_time = _parse_obs_dt(raw_obs_dt) if raw_obs_dt else (None, False)
        observations.append(
            EbirdObservation(
                common_name=common_name,
                observed_at=dt,
                observed_has_time=has_time,
                raw_observed_at=raw_obs_dt,
            )
        )
    return observations


def fetch_recent_location_observations(
    *,
    loc_id: str,
    back_days: int,
    max_results: int,
    timeout_s: float = 12.0,
) -> list[EbirdObservation]:
    settings = get_settings()
    if not settings.ebird_api_key:
        raise RuntimeError("Missing EBIRD_API_KEY.")

    loc_id = loc_id.strip()
    if not loc_id:
        return []

    url = f"{EBIRD_BASE_URL}/data/obs/loc/{loc_id}/recent"
    headers = {"X-eBirdApiToken": settings.ebird_api_key}
    params = {
        "back": back_days,
        "maxResults": max_results,
    }

    with httpx.Client(timeout=timeout_s) as client:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        payload: list[dict[str, Any]] = response.json()

    observations: list[EbirdObservation] = []
    for item in payload:
        common_name = str(item.get("comName") or "").strip()
        if not common_name:
            continue
        raw_obs_dt = str(item.get("obsDt") or "").strip()
        dt, has_time = _parse_obs_dt(raw_obs_dt) if raw_obs_dt else (None, False)
        observations.append(
            EbirdObservation(
                common_name=common_name,
                observed_at=dt,
                observed_has_time=has_time,
                raw_observed_at=raw_obs_dt,
            )
        )
    return observations


def fetch_hotspots_geo(
    *,
    lat: float,
    lng: float,
    dist_km: int,
    max_results: int = 200,
    timeout_s: float = 12.0,
) -> list[EbirdHotspot]:
    settings = get_settings()
    if not settings.ebird_api_key:
        raise RuntimeError("Missing EBIRD_API_KEY.")

    url = f"{EBIRD_BASE_URL}/ref/hotspot/geo"
    headers = {"X-eBirdApiToken": settings.ebird_api_key}
    params = {
        "lat": lat,
        "lng": lng,
        "dist": dist_km,
        "fmt": "json",
    }

    with httpx.Client(timeout=timeout_s) as client:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        payload: list[dict[str, Any]] = response.json()

    hotspots: list[EbirdHotspot] = []
    for item in payload[:max_results]:
        loc_id = str(item.get("locId") or "").strip()
        loc_name = str(item.get("locName") or "").strip()
        if not (loc_id and loc_name):
            continue

        try:
            h_lat = float(item.get("lat"))
            h_lng = float(item.get("lng"))
        except (TypeError, ValueError):
            continue

        hotspots.append(EbirdHotspot(id=loc_id, name=loc_name, lat=h_lat, lng=h_lng))

    hotspots.sort(key=lambda h: (_haversine_km(lat, lng, h.lat, h.lng), h.name.lower()))
    return hotspots


def observations_to_predictions(
    *,
    observations: list[EbirdObservation],
    requested_month: int,
    requested_bucket: str,
    back_days: int,
    limit: int,
    scope: str,
) -> tuple[list[dict[str, Any]], str, bool, str]:
    """Return (rows, confidence, fallback_used, reason).

    rows: list of {species, score, reason} style dicts.
    """
    now_date = datetime.now(timezone.utc).date()

    def score_for(obs: EbirdObservation) -> int:
        if not obs.observed_at:
            return 1
        days_since = (now_date - obs.observed_at.date()).days
        return max(1, back_days - max(0, days_since))

    def matches_month(obs: EbirdObservation) -> bool:
        if not obs.observed_at:
            return True
        return obs.observed_at.month == requested_month

    def matches_bucket(obs: EbirdObservation) -> bool:
        if not (obs.observed_at and obs.observed_has_time):
            return True
        return _hour_bucket_for_hour(obs.observed_at.hour) == requested_bucket

    # Pass 1: strict filters (month + bucket)
    filtered = [obs for obs in observations if matches_month(obs) and matches_bucket(obs)]
    fallback_used = False
    confidence = "medium"
    reason = f"eBird: {scope}, filtros exactos"

    # Pass 2: relax month only
    if not filtered:
        filtered = [obs for obs in observations if matches_bucket(obs)]
        fallback_used = True
        confidence = "low"
        reason = f"eBird: {scope}, mes relajado"

    # Pass 3: relax both (bucket + month)
    if not filtered:
        filtered = observations[:]
        fallback_used = True
        confidence = "low"
        reason = f"eBird: {scope}, filtros relajados"

    scores: dict[str, int] = {}
    for obs in filtered:
        name = obs.common_name.strip()
        if not name:
            continue
        scores[name] = scores.get(name, 0) + score_for(obs)

    rows: list[dict[str, Any]] = []
    ranked = sorted(scores.items(), key=lambda pair: (-pair[1], pair[0].lower()))
    for species, score in ranked[:limit]:
        rows.append({"species": species, "score": score, "reason": reason})
    return rows, confidence, fallback_used, reason
