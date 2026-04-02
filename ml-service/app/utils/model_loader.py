from functools import lru_cache
from pathlib import Path

import joblib


@lru_cache(maxsize=1)
def load_model():
    model_path = Path(__file__).resolve().parents[1] / "model" / "traffic_model.pkl"
    if not model_path.exists():
        raise FileNotFoundError(
            f"Trained model not found at {model_path}. Run: python app/model/train_model.py"
        )
    return joblib.load(model_path)
