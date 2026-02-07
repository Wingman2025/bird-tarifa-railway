from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import httpx


@dataclass(frozen=True)
class WikiBirdInfo:
    title: str
    extract: str | None
    photo_url: str | None
    page_url: str | None
    source: str


def _wiki_api_base(lang: str) -> str:
    return f"https://{lang}.wikipedia.org"


def _wiki_user_agent() -> str:
    # Wikipedia asks clients to set a descriptive UA.
    return "BirdTarifa/1.0 (https://github.com/Wingman2025/bird-tarifa-railway)"


def _search_wikipedia_title(*, lang: str, query: str, timeout_s: float = 10.0) -> str | None:
    query = query.strip()
    if not query:
        return None

    url = f"{_wiki_api_base(lang)}/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srlimit": 1,
        "srsearch": query,
        "utf8": 1,
    }

    headers = {"User-Agent": _wiki_user_agent()}
    with httpx.Client(timeout=timeout_s, headers=headers) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()

    items = (payload.get("query", {}) or {}).get("search", [])
    if not items:
        return None
    title = str(items[0].get("title") or "").strip()
    return title or None


def _fetch_wikipedia_summary(*, lang: str, title: str, timeout_s: float = 10.0) -> WikiBirdInfo | None:
    title = title.strip()
    if not title:
        return None

    url = f"{_wiki_api_base(lang)}/api/rest_v1/page/summary/{quote(title)}"
    headers = {"User-Agent": _wiki_user_agent()}
    with httpx.Client(timeout=timeout_s, headers=headers) as client:
        response = client.get(url)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        payload: dict[str, Any] = response.json()

    extract = str(payload.get("extract") or "").strip() or None

    photo_url = None
    thumbnail = payload.get("thumbnail") or {}
    if isinstance(thumbnail, dict):
        photo_url = str(thumbnail.get("source") or "").strip() or None
    if not photo_url:
        original = payload.get("originalimage") or {}
        if isinstance(original, dict):
            photo_url = str(original.get("source") or "").strip() or None

    page_url = None
    content_urls = payload.get("content_urls") or {}
    if isinstance(content_urls, dict):
        desktop = content_urls.get("desktop") or {}
        if isinstance(desktop, dict):
            page_url = str(desktop.get("page") or "").strip() or None

    return WikiBirdInfo(
        title=title,
        extract=extract,
        photo_url=photo_url,
        page_url=page_url,
        source=f"wikipedia:{lang}",
    )


@lru_cache(maxsize=1024)
def lookup_bird_info(species: str) -> WikiBirdInfo | None:
    """Best-effort bird info lookup via Wikipedia (es -> en fallback).

    Cached in-memory to keep the UI snappy and avoid repeated lookups.
    """
    species = species.strip()
    if not species:
        return None

    for lang in ("es", "en"):
        try:
            title = _search_wikipedia_title(lang=lang, query=species)
            if not title:
                continue
            info = _fetch_wikipedia_summary(lang=lang, title=title)
            if info:
                return info
        except Exception:
            continue

    return None

