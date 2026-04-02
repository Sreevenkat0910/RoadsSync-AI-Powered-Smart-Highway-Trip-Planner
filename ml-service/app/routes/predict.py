from fastapi import APIRouter, HTTPException

from app.model.request_model import PredictRequest
from app.services.predict_service import predict_traffic

router = APIRouter()


@router.post("/predict")
def predict(payload: PredictRequest):
    try:
        result = predict_traffic(payload.model_dump())
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Prediction failed due to internal error") from exc
