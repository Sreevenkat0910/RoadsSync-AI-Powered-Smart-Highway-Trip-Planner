from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


def _traffic_level_from_score(score):
    if score <= 30:
        return "low"
    if score <= 70:
        return "medium"
    return "high"


@lru_cache(maxsize=1)
def _load_lstm_assets():
    # Lazy import keeps current RF service usable without TensorFlow installed.
    from tensorflow.keras.models import load_model

    model_dir = Path(__file__).resolve().parents[1] / "model"
    model_path = model_dir / "lstm_model.h5"
    preprocess_path = model_dir / "lstm_preprocess.pkl"

    if not model_path.exists():
        raise FileNotFoundError(f"LSTM model not found at {model_path}. Run: python app/model/train_lstm.py")
    if not preprocess_path.exists():
        raise FileNotFoundError(
            f"LSTM preprocess artifact not found at {preprocess_path}. Run: python app/model/train_lstm.py"
        )

    model = load_model(model_path)
    preprocess = joblib.load(preprocess_path)
    return model, preprocess


def _encode_rows_to_features(rows_df, preprocess):
    cat_cols = ["route", "day_of_week"]
    numeric_cols = ["timestamp", "hour", "month", "is_weekend", "is_holiday", "days_to_holiday"]

    df = rows_df.copy()
    if "timestamp" not in df.columns:
        df["timestamp"] = pd.to_datetime(df["datetime"], errors="coerce").astype("int64") // 10**9

    for col in numeric_cols:
        df[col] = pd.to_numeric(df.get(col), errors="coerce")
        df[col] = df[col].fillna(preprocess["numeric_defaults"].get(col, 0.0))

    for col in cat_cols:
        df[col] = df.get(col, "unknown").fillna("unknown").astype(str)

    encoded = pd.get_dummies(df[cat_cols], prefix=cat_cols, dtype=np.float32)
    feature_df = pd.concat([df[numeric_cols].astype(np.float32), encoded], axis=1)

    # Align features exactly to training columns.
    for col in preprocess["feature_columns"]:
        if col not in feature_df.columns:
            feature_df[col] = 0.0
    feature_df = feature_df[preprocess["feature_columns"]]
    return feature_df


def predict_traffic_lstm(sequence_rows):
    """
    sequence_rows: list of dicts, each with keys:
      hour, day_of_week, month, is_weekend, is_holiday, days_to_holiday, route
    """
    model, preprocess = _load_lstm_assets()
    seq_len = preprocess["sequence_length"]

    if not isinstance(sequence_rows, list) or len(sequence_rows) < seq_len:
        raise ValueError(f"sequence_rows must be a list with at least {seq_len} rows")

    rows_df = pd.DataFrame(sequence_rows[-seq_len:])
    if "datetime" not in rows_df.columns:
        rows_df["datetime"] = pd.Timestamp.now()

    feature_df = _encode_rows_to_features(rows_df, preprocess)
    X = np.array([feature_df.to_numpy(dtype=np.float32)])

    pred_scaled = float(model.predict(X, verbose=0)[0][0])
    pred_scaled = max(0.0, min(1.0, pred_scaled))
    pred_score = preprocess["target_scaler"].inverse_transform([[pred_scaled]])[0][0]
    pred_score = float(max(0.0, min(100.0, pred_score)))

    return {
        "traffic_score": round(pred_score, 2),
        "traffic_level": _traffic_level_from_score(pred_score),
    }
