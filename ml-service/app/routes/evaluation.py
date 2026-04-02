from fastapi import APIRouter, HTTPException

from app.model.evaluate import evaluate_models

router = APIRouter()


@router.get("/model/evaluation")
def model_evaluation():
    try:
        return evaluate_models()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Model evaluation failed") from exc

