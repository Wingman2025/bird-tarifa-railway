from datetime import datetime, timezone

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_db
from .ebird import fetch_recent_geo_observations, observations_to_predictions
from .models import PredictionRule, Sighting
from .schemas import (
    HourBucket,
    PhotoDeleteIn,
    PhotoDeleteOut,
    PhotoUploadOut,
    PredictionOut,
    PredictionRuleCreate,
    SeedResult,
    SightingCreate,
    SightingOut,
)
from .storage.s3 import build_photo_key, delete_object, upload_image_bytes

settings = get_settings()
app = FastAPI(title=settings.app_name)

ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png", "image/webp"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Bird Tarifa API is running."}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


@app.post("/uploads/photo", response_model=PhotoUploadOut)
async def upload_photo(file: UploadFile = File(...)) -> PhotoUploadOut:
    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type. Use jpeg, png or webp.",
        )

    payload = await file.read()
    await file.close()

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file payload.",
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(payload) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_mb}MB limit.",
        )

    try:
        key = build_photo_key(file.content_type or "")
        photo_url = upload_image_bytes(
            key=key,
            payload=payload,
            content_type=file.content_type or "application/octet-stream",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return PhotoUploadOut(
        photo_url=photo_url,
        key=key,
        content_type=file.content_type or "",
        size_bytes=len(payload),
    )


@app.delete("/uploads/photo", response_model=PhotoDeleteOut)
def delete_photo(payload: PhotoDeleteIn) -> PhotoDeleteOut:
    try:
        delete_object(payload.key)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    return PhotoDeleteOut(deleted=True)


@app.post("/sightings", response_model=SightingOut, status_code=status.HTTP_201_CREATED)
def create_sighting(payload: SightingCreate, db: Session = Depends(get_db)) -> Sighting:
    record = Sighting(
        zone=payload.zone.strip(),
        species_guess=(payload.species_guess.strip() if payload.species_guess else None),
        notes=(payload.notes.strip() if payload.notes else None),
        photo_url=(payload.photo_url.strip() if payload.photo_url else None),
        observed_at=payload.observed_at or datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/sightings", response_model=list[SightingOut])
def list_sightings(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Sighting]:
    stmt = select(Sighting).order_by(Sighting.observed_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


@app.post(
    "/prediction-rules",
    response_model=PredictionRuleCreate,
    status_code=status.HTTP_201_CREATED,
)
def create_prediction_rule(
    payload: PredictionRuleCreate,
    db: Session = Depends(get_db),
) -> PredictionRuleCreate:
    existing = db.scalar(
        select(PredictionRule).where(
            PredictionRule.zone == payload.zone.strip(),
            PredictionRule.month == payload.month,
            PredictionRule.hour_bucket == payload.hour_bucket,
            PredictionRule.species == payload.species.strip(),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Prediction rule already exists for that scope.",
        )

    row = PredictionRule(
        zone=payload.zone.strip(),
        month=payload.month,
        hour_bucket=payload.hour_bucket,
        species=payload.species.strip(),
        weight=payload.weight,
    )
    db.add(row)
    db.commit()
    return payload


@app.get("/predictions", response_model=list[PredictionOut])
def get_predictions(
    zone: str = Query(min_length=2, max_length=120),
    month: int = Query(ge=1, le=12),
    hour_bucket: HourBucket = Query(),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[PredictionOut]:
    def query_rules(
        *,
        months: list[int] | None,
        bucket: HourBucket | None,
    ):
        stmt = select(
            PredictionRule.species.label("species"),
            func.sum(PredictionRule.weight).label("score"),
        ).where(PredictionRule.zone == zone)
        if months is not None:
            if len(months) == 1:
                stmt = stmt.where(PredictionRule.month == months[0])
            else:
                stmt = stmt.where(PredictionRule.month.in_(months))
        if bucket is not None:
            stmt = stmt.where(PredictionRule.hour_bucket == bucket)
        stmt = (
            stmt.group_by(PredictionRule.species)
            .order_by(func.sum(PredictionRule.weight).desc(), PredictionRule.species.asc())
            .limit(limit)
        )
        return db.execute(stmt).all()

    def build(rows, *, confidence: str, fallback_used: bool, reason: str) -> list[PredictionOut]:
        return [
            PredictionOut(
                species=row.species,
                score=int(row.score),
                reason=reason,
                confidence=confidence,  # type: ignore[arg-type]
                fallback_used=fallback_used,
            )
            for row in rows
        ]

    # 1) Exact rules
    exact_rows = query_rules(months=[month], bucket=hour_bucket)
    if exact_rows:
        return build(
            exact_rows,
            confidence="high",
            fallback_used=False,
            reason=f"reglas: {zone}, mes {month}, {hour_bucket}",
        )

    # 2) Same month, ignore hour bucket
    month_rows = query_rules(months=[month], bucket=None)
    if month_rows:
        return build(
            month_rows,
            confidence="medium",
            fallback_used=True,
            reason=f"reglas (fallback): {zone}, mes {month}, franja relajada",
        )

    # 3) Neighbor months, same hour bucket
    prev_month = 12 if month == 1 else month - 1
    next_month = 1 if month == 12 else month + 1
    neighbor_rows = query_rules(months=[prev_month, next_month], bucket=hour_bucket)
    if neighbor_rows:
        return build(
            neighbor_rows,
            confidence="low",
            fallback_used=True,
            reason=f"reglas (fallback): {zone}, mes cercano, {hour_bucket}",
        )

    # 4) Zone-only fallback
    zone_rows = query_rules(months=None, bucket=None)
    if zone_rows:
        return build(
            zone_rows,
            confidence="low",
            fallback_used=True,
            reason=f"reglas (fallback): {zone}, mostrando base general",
        )

    # 5) External fallback: eBird recent observations near the configured point.
    if settings.ebird_api_key:
        try:
            observations = fetch_recent_geo_observations(
                lat=settings.ebird_geo_lat,
                lng=settings.ebird_geo_lng,
                dist_km=settings.ebird_geo_dist_km,
                back_days=settings.ebird_geo_back_days,
                max_results=200,
            )
            rows, confidence, fallback_used, _reason = observations_to_predictions(
                observations=observations,
                requested_month=month,
                requested_bucket=hour_bucket,
                back_days=settings.ebird_geo_back_days,
                limit=limit,
            )
            return [
                PredictionOut(
                    species=row["species"],
                    score=int(row["score"]),
                    reason=str(row["reason"]),
                    confidence=confidence,  # type: ignore[arg-type]
                    fallback_used=fallback_used,
                )
                for row in rows
            ]
        except Exception:
            # Keep the endpoint stable; external sources should never hard-fail the API.
            return []

    return []


@app.post("/prediction-rules/seed", response_model=SeedResult)
def seed_prediction_rules(db: Session = Depends(get_db)) -> SeedResult:
    sample_rules = [
        PredictionRuleCreate(
            zone="Tarifa Centro",
            month=10,
            hour_bucket="dawn",
            species="Cernicalo vulgar",
            weight=4,
        ),
        PredictionRuleCreate(
            zone="Tarifa Centro",
            month=10,
            hour_bucket="morning",
            species="Gorrion comun",
            weight=3,
        ),
        PredictionRuleCreate(
            zone="Tarifa Centro",
            month=10,
            hour_bucket="evening",
            species="Estornino negro",
            weight=2,
        ),
        PredictionRuleCreate(
            zone="Bolonia",
            month=10,
            hour_bucket="dawn",
            species="Abejaruco europeo",
            weight=5,
        ),
        PredictionRuleCreate(
            zone="Bolonia",
            month=10,
            hour_bucket="afternoon",
            species="Milano negro",
            weight=3,
        ),
    ]

    inserted = 0
    for rule in sample_rules:
        exists = db.scalar(
            select(PredictionRule).where(
                PredictionRule.zone == rule.zone,
                PredictionRule.month == rule.month,
                PredictionRule.hour_bucket == rule.hour_bucket,
                PredictionRule.species == rule.species,
            )
        )
        if exists:
            continue
        db.add(
            PredictionRule(
                zone=rule.zone,
                month=rule.month,
                hour_bucket=rule.hour_bucket,
                species=rule.species,
                weight=rule.weight,
            )
        )
        inserted += 1

    db.commit()
    return SeedResult(inserted=inserted)
