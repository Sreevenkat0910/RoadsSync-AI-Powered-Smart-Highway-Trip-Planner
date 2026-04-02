import pandas as pd
import numpy as np
import joblib
from functools import lru_cache
from pathlib import Path

from app.config.settings import MODEL_TYPE
from app.utils.model_loader import load_model


def _score_from_prediction(level, confidence):
    confidence = max(0.0, min(1.0, float(confidence)))
    if level == "low":
        return int(round(20 + confidence * 10))   # 20-30
    if level == "medium":
        return int(round(40 + confidence * 30))   # 40-70
    return int(round(75 + confidence * 20))       # 75-95


def _score_to_level(score):
    if score <= 30:
        return "low"
    if score <= 70:
        return "medium"
    return "high"


@lru_cache(maxsize=1)
def _load_lstm_assets():
    from tensorflow.keras.models import load_model

    model_dir = Path(__file__).resolve().parents[1] / "model"
    model_path = model_dir / "lstm_model.h5"
    scaler_path = model_dir / "scaler.pkl"

    if not model_path.exists():
        raise FileNotFoundError(f"LSTM model not found at {model_path}. Run: python app/model/train_lstm.py")
    if not scaler_path.exists():
        raise FileNotFoundError(f"LSTM scaler not found at {scaler_path}. Run: python app/model/train_lstm.py")

    model = load_model(model_path, compile=False)
    scaler_artifact = joblib.load(scaler_path)
    return model, scaler_artifact


def _predict_with_rf(data):
    artifact = load_model()
    pipeline = artifact["pipeline"]
    feature_columns = artifact["feature_columns"]

    input_row = {
        "hour": data["hour"],
        "day_of_week": data["day_of_week"],
        "month": data["month"],
        "is_weekend": data["is_weekend"],
        "is_holiday": data["is_holiday"],
        "days_to_holiday": data["days_to_holiday"],
        "route": data["route"],
    }
    input_df = pd.DataFrame([input_row], columns=feature_columns)

    predicted_level = pipeline.predict(input_df)[0]
    probabilities = pipeline.predict_proba(input_df)[0]
    confidence = max(probabilities) if len(probabilities) > 0 else 0.5
    traffic_score = _score_from_prediction(predicted_level, confidence)

    return {"traffic_level": predicted_level, "traffic_score": traffic_score}


def _predict_with_lstm(data):
    model, scaler_artifact = _load_lstm_assets()
    scaler = scaler_artifact["scaler"]
    features = scaler_artifact["features"]
    window_size = scaler_artifact.get("window_size", 5)
    target_index = scaler_artifact["target_index"]

    # Numeric-only vector used by trained LSTM.
    feature_vector = np.array([
        float(data["hour"]),
        float(data["month"]),
        float(data["is_weekend"]),
        float(data["is_holiday"]),
        float(data["days_to_holiday"]),
        50.0,  # placeholder prior traffic_score for autoregressive slot
    ], dtype=np.float32)

    # Scale one step and repeat to create a window_size sequence.
    scaled_step = scaler.transform([feature_vector])[0]
    sequence = np.array([scaled_step for _ in range(window_size)], dtype=np.float32)
    X = np.array([sequence], dtype=np.float32)

    pred_scaled = float(model.predict(X, verbose=0)[0][0])
    pred_scaled = max(0.0, min(1.0, pred_scaled))

    row = np.zeros((1, len(features)), dtype=np.float32)
    row[0, target_index] = pred_scaled
    pred_score = float(scaler.inverse_transform(row)[0, target_index])
    pred_score = max(0.0, min(100.0, pred_score))

    return {
        "traffic_level": _score_to_level(pred_score),
        "traffic_score": int(round(pred_score)),
    }


def predict_traffic(data):
    model_type = (MODEL_TYPE or "rf").strip().lower()
    if model_type not in {"rf", "lstm"}:
        model_type = "rf"

    print(f"Using model: {model_type}")

    if model_type == "lstm":
        return _predict_with_lstm(data)
    return _predict_with_rf(data)
