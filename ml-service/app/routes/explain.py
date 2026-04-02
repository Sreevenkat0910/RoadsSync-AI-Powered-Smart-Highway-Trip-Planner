from fastapi import APIRouter, HTTPException

from app.model.explain import explain_prediction
from app.model.request_model import PredictRequest

router = APIRouter()


@router.post("/model/explain")
def explain(payload: PredictRequest):
    try:
        return explain_prediction(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="SHAP explanation failed") from exc

