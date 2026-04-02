from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    day_of_week: str = Field(..., min_length=3)
    month: int = Field(..., ge=1, le=12)
    is_weekend: int = Field(..., ge=0, le=1)
    is_holiday: int = Field(..., ge=0, le=1)
    days_to_holiday: int
    route: str = Field(..., min_length=3)
