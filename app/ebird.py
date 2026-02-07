from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
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


def observations_to_predictions(
    *,
    observations: list[EbirdObservation],
    requested_month: int,
    requested_bucket: str,
    back_days: int,
    limit: int,
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
    reason = "eBird reciente (filtros exactos)"

    # Pass 2: relax month only
    if not filtered:
        filtered = [obs for obs in observations if matches_bucket(obs)]
        fallback_used = True
        confidence = "low"
        reason = "eBird reciente (mes relajado)"

    # Pass 3: relax both (bucket + month)
    if not filtered:
        filtered = observations[:]
        fallback_used = True
        confidence = "low"
        reason = "eBird reciente (filtros relajados)"

    scored = sorted(
        filtered,
        key=lambda obs: (score_for(obs), obs.common_name.lower()),
        reverse=True,
    )

    rows: list[dict[str, Any]] = []
    for obs in scored[:limit]:
        rows.append(
            {
                "species": obs.common_name,
                "score": score_for(obs),
                "reason": reason,
            }
        )
    return rows, confidence, fallback_used, reason

