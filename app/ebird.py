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
    country_code: str | None = None
    latest_obs_dt: datetime | None = None
    num_species_all_time: int | None = None
    num_checklists_all_time: int | None = None


def _parse_obs_dt(value: str) -> tuple[datetime | None, bool]:
    value = value.strip()
    for fmt, has_time in (("%Y-%m-%d %H:%M", True), ("%Y-%m-%d", False)):
        try:
            return datetime.strptime(value, fmt), has_time
        except ValueError:
            continue
    return None, False

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
    if settings.ebird_spp_locale.strip():
        params["sppLocale"] = settings.ebird_spp_locale.strip()

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

    # Note: eBird supports passing a hotspot locId to the same endpoint used for regions:
    # /data/obs/{regionCodeOrLocId}/recent
    url = f"{EBIRD_BASE_URL}/data/obs/{loc_id}/recent"
    headers = {"X-eBirdApiToken": settings.ebird_api_key}
    params = {
        "back": back_days,
        "maxResults": max_results,
    }
    if settings.ebird_spp_locale.strip():
        params["sppLocale"] = settings.ebird_spp_locale.strip()

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

        country_code = str(item.get("countryCode") or "").strip() or None
        latest_raw = str(item.get("latestObsDt") or "").strip()
        latest_dt, _has_time = _parse_obs_dt(latest_raw) if latest_raw else (None, False)

        num_species = None
        try:
            value = item.get("numSpeciesAllTime")
            num_species = int(value) if value is not None else None
        except (TypeError, ValueError):
            num_species = None

        num_checklists = None
        try:
            value = item.get("numChecklistsAllTime")
            num_checklists = int(value) if value is not None else None
        except (TypeError, ValueError):
            num_checklists = None

        hotspots.append(
            EbirdHotspot(
                id=loc_id,
                name=loc_name,
                lat=h_lat,
                lng=h_lng,
                country_code=country_code,
                latest_obs_dt=latest_dt,
                num_species_all_time=num_species,
                num_checklists_all_time=num_checklists,
            )
        )

    hotspots.sort(key=lambda h: (_haversine_km(lat, lng, h.lat, h.lng), h.name.lower()))
    return hotspots


def observations_to_predictions(
    *,
    observations: list[EbirdObservation],
    requested_month: int,
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

    # Pass 1: strict filter (month only)
    filtered = [obs for obs in observations if matches_month(obs)]
    fallback_used = False
    confidence = "medium"
    reason = f"eBird: {scope}, mes exacto"

    # Pass 2: relax month
    if not filtered:
        filtered = observations[:]
        fallback_used = True
        confidence = "low"
        reason = f"eBird: {scope}, mes relajado"

    scores: dict[str, int] = {}
    counts: dict[str, int] = {}
    last_seen_at: dict[str, datetime] = {}
    for obs in filtered:
        name = obs.common_name.strip()
        if not name:
            continue
        scores[name] = scores.get(name, 0) + score_for(obs)
        counts[name] = counts.get(name, 0) + 1
        if obs.observed_at:
            prev = last_seen_at.get(name)
            if prev is None or obs.observed_at > prev:
                last_seen_at[name] = obs.observed_at

    rows: list[dict[str, Any]] = []
    ranked = sorted(
        scores.keys(),
        key=lambda species: (
            -scores[species],
            -counts.get(species, 0),
            -(last_seen_at.get(species).timestamp() if species in last_seen_at else 0.0),
            species.lower(),
        ),
    )

    for species in ranked[:limit]:
        last_seen = last_seen_at.get(species)
        rows.append(
            {
                "species": species,
                "score": scores[species],
                "reason": reason,
                "observations_count": counts.get(species, 0),
                "last_seen_days_ago": (now_date - last_seen.date()).days if last_seen else None,
            }
        )
    return rows, confidence, fallback_used, reason
