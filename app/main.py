from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_db
from .models import PredictionRule, Sighting
from .schemas import (
    HourBucket,
    PredictionOut,
    PredictionRuleCreate,
    SeedResult,
    SightingCreate,
    SightingOut,
)

settings = get_settings()
app = FastAPI(title=settings.app_name)

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
    stmt = (
        select(
            PredictionRule.species.label("species"),
            func.sum(PredictionRule.weight).label("score"),
        )
        .where(
            PredictionRule.zone == zone,
            PredictionRule.month == month,
            PredictionRule.hour_bucket == hour_bucket,
        )
        .group_by(PredictionRule.species)
        .order_by(func.sum(PredictionRule.weight).desc(), PredictionRule.species.asc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        PredictionOut(
            species=row.species,
            score=int(row.score),
            reason=f"zone={zone}, month={month}, bucket={hour_bucket}",
        )
        for row in rows
    ]


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
