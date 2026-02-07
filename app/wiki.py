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
    description: str | None = None
    page_type: str | None = None


def _wiki_api_base(lang: str) -> str:
    return f"https://{lang}.wikipedia.org"


def _wiki_user_agent() -> str:
    # Wikipedia asks clients to set a descriptive UA.
    return "BirdTarifa/1.0 (https://github.com/Wingman2025/bird-tarifa-railway)"


def _search_wikipedia_titles(
    *,
    lang: str,
    query: str,
    limit: int = 5,
    timeout_s: float = 10.0,
) -> list[str]:
    query = query.strip()
    if not query:
        return []

    url = f"{_wiki_api_base(lang)}/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srlimit": max(1, min(10, limit)),
        "srsearch": query,
        "utf8": 1,
    }

    headers = {"User-Agent": _wiki_user_agent()}
    with httpx.Client(timeout=timeout_s, headers=headers) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()

    items = (payload.get("query", {}) or {}).get("search", [])

    titles: list[str] = []
    for item in items:
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        titles.append(title)

    return titles


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

    page_type = str(payload.get("type") or "").strip() or None
    description = str(payload.get("description") or "").strip() or None
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
        description=description,
        page_type=page_type,
    )


def _looks_like_bird(*, lang: str, info: WikiBirdInfo) -> bool:
    if info.page_type == "disambiguation":
        return False

    text = " ".join(
        part
        for part in (
            info.title,
            info.description or "",
            info.extract or "",
        )
        if part
    ).lower()

    if not text:
        return False

    if lang == "es":
        hints = ("ave", "pájaro", "especie de ave", "especie de pájaro", "familia de aves", "género de aves")
    else:
        hints = ("bird", "species of bird", "family of birds", "genus of birds", "passerine", "raptor")

    return any(hint in text for hint in hints)


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
            # Try a couple of query variants to avoid unrelated results (albums, bands, etc).
            queries = [species]
            if lang == "en":
                queries.extend((f"{species} bird", f"{species} species"))
            else:
                queries.extend((f"{species} ave", f"{species} pájaro"))

            seen_titles: set[str] = set()
            best_without_photo: WikiBirdInfo | None = None

            for query in queries:
                titles = _search_wikipedia_titles(lang=lang, query=query, limit=6)
                for title in titles:
                    key = title.strip().lower()
                    if not key or key in seen_titles:
                        continue
                    seen_titles.add(key)

                    info = _fetch_wikipedia_summary(lang=lang, title=title)
                    if not info:
                        continue
                    if not _looks_like_bird(lang=lang, info=info):
                        continue

                    if info.photo_url:
                        return info
                    if best_without_photo is None:
                        best_without_photo = info

            if best_without_photo:
                return best_without_photo
        except Exception:
            continue

    return None
