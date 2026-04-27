from datetime import datetime
from typing import Optional

from sqlalchemy import event
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.utcnow()


class TimestampModel(SQLModel):
    """Base mixin that adds audit timestamp fields to every business entity."""

    creado_en: datetime = Field(default_factory=_now)
    actualizado_en: datetime = Field(default_factory=_now)


class SoftDeleteModel(TimestampModel):
    """Extends TimestampModel with a soft-delete field."""

    eliminado_en: Optional[datetime] = Field(default=None)


# ---------------------------------------------------------------------------
# SQLAlchemy event listener: auto-update actualizado_en on every UPDATE
# ---------------------------------------------------------------------------

@event.listens_for(TimestampModel, "before_update", propagate=True)
def _set_actualizado_en(mapper: object, connection: object, target: TimestampModel) -> None:  # noqa: ARG001
    target.actualizado_en = _now()
