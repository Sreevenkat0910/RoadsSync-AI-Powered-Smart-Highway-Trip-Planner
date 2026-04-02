from fastapi import FastAPI

from app.routes.evaluation import router as evaluation_router
from app.routes.explain import router as explain_router
from app.routes.predict import router as predict_router
from app.utils.model_loader import load_model

app = FastAPI(title="RoadsSync ML Service")


@app.get("/")
def health_check():
    return "ML Service Running"


@app.on_event("startup")
def warmup_model():
    # Load once at startup to avoid first-request latency.
    load_model()


app.include_router(predict_router)
app.include_router(evaluation_router)
app.include_router(explain_router)
