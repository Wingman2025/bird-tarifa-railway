from datetime import datetime

from sqlalchemy import Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import DateTime

from .db import Base


class Sighting(Base):
    __tablename__ = "sightings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    zone: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    species_guess: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)


class PredictionRule(Base):
    __tablename__ = "prediction_rules"
    __table_args__ = (
        UniqueConstraint(
            "zone",
            "month",
            "hour_bucket",
            "species",
            name="uq_prediction_rule_scope",
        ),
        Index("ix_prediction_rule_lookup", "zone", "month", "hour_bucket"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    zone: Mapped[str] = mapped_column(String(120), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    hour_bucket: Mapped[str] = mapped_column(String(24), nullable=False)
    species: Mapped[str] = mapped_column(String(120), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
