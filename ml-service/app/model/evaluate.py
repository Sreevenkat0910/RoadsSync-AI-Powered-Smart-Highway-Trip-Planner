from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_squared_error,
)
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import load_model


def evaluate_models():
    root = Path(__file__).resolve().parents[3]
    data_path = root / "data" / "traffic.csv"
    model_dir = Path(__file__).resolve().parent
    rf_model_path = model_dir / "traffic_model.pkl"
    lstm_model_path = model_dir / "lstm_model.h5"
    scaler_path = model_dir / "scaler.pkl"

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found at {data_path}")
    if not rf_model_path.exists():
        raise FileNotFoundError(f"Random Forest model not found at {rf_model_path}")
    if not lstm_model_path.exists() or not scaler_path.exists():
        raise FileNotFoundError("LSTM model/scaler not found. Train LSTM first.")

    df = pd.read_csv(data_path)

    # ---------------- Random Forest metrics ----------------
    rf_features = ["hour", "day_of_week", "month", "is_weekend", "is_holiday", "days_to_holiday", "route"]
    rf_target = "traffic_level"

    rf_df = df[rf_features + [rf_target]].copy()
    for col in ["hour", "month", "is_weekend", "is_holiday", "days_to_holiday"]:
        rf_df[col] = pd.to_numeric(rf_df[col], errors="coerce")
    for col in ["day_of_week", "route", rf_target]:
        rf_df[col] = rf_df[col].astype("string")

    X_rf = rf_df[rf_features]
    y_rf = rf_df[rf_target]
    _, X_test_rf, _, y_test_rf = train_test_split(
        X_rf, y_rf, test_size=0.2, random_state=42, stratify=y_rf
    )

    rf_artifact = joblib.load(rf_model_path)
    rf_pipeline = rf_artifact["pipeline"]
    y_pred_rf = rf_pipeline.predict(X_test_rf)

    rf_accuracy = accuracy_score(y_test_rf, y_pred_rf)
    rf_cm = confusion_matrix(y_test_rf, y_pred_rf, labels=rf_pipeline.classes_)
    rf_report = classification_report(y_test_rf, y_pred_rf, output_dict=True, zero_division=0)

    # ---------------- LSTM metrics ----------------
    lstm_df = df.copy()
    lstm_df["datetime"] = pd.to_datetime(lstm_df["datetime"], errors="coerce")
    lstm_df = lstm_df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)

    scaler_artifact = joblib.load(scaler_path)
    scaler = scaler_artifact["scaler"]
    features = scaler_artifact["features"]
    window_size = scaler_artifact["window_size"]
    target_index = scaler_artifact["target_index"]

    for col in features:
        lstm_df[col] = pd.to_numeric(lstm_df[col], errors="coerce")
    lstm_df[features] = lstm_df[features].fillna(lstm_df[features].median(numeric_only=True))

    scaled_data = scaler.transform(lstm_df[features].to_numpy(dtype=np.float32))
    X_lstm, y_scaled_actual = [], []
    for i in range(window_size, len(scaled_data)):
        X_lstm.append(scaled_data[i - window_size:i])
        y_scaled_actual.append(scaled_data[i, target_index])

    X_lstm = np.array(X_lstm, dtype=np.float32)
    y_scaled_actual = np.array(y_scaled_actual, dtype=np.float32)
    split_idx = int(len(X_lstm) * 0.8)
    X_test_lstm = X_lstm[split_idx:]
    y_test_scaled = y_scaled_actual[split_idx:]

    lstm_model = load_model(lstm_model_path, compile=False)
    y_pred_scaled = lstm_model.predict(X_test_lstm, verbose=0).reshape(-1)

    # Inverse-transform scaled target to original traffic_score space
    y_actual_scores, y_pred_scores = [], []
    for idx in range(len(y_pred_scaled)):
        actual_row = np.zeros((1, len(features)), dtype=np.float32)
        pred_row = np.zeros((1, len(features)), dtype=np.float32)
        actual_row[0, target_index] = y_test_scaled[idx]
        pred_row[0, target_index] = y_pred_scaled[idx]
        y_actual_scores.append(float(scaler.inverse_transform(actual_row)[0, target_index]))
        y_pred_scores.append(float(scaler.inverse_transform(pred_row)[0, target_index]))

    lstm_mse = mean_squared_error(y_actual_scores, y_pred_scores)
    lstm_rmse = float(np.sqrt(lstm_mse))

    return {
        "rf_accuracy": float(rf_accuracy),
        "rf_confusion_matrix": rf_cm.tolist(),
        "rf_classification_report": rf_report,
        "rf_labels": [str(c) for c in rf_pipeline.classes_],
        "lstm_mse": float(lstm_mse),
        "lstm_rmse": lstm_rmse,
    }

