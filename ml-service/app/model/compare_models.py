from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, mean_squared_error
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import load_model
import joblib


def score_to_level(score):
    if score <= 30:
        return "low"
    if score <= 70:
        return "medium"
    return "high"


def compare_models():
    root = Path(__file__).resolve().parents[3]
    data_path = root / "data" / "traffic.csv"
    model_dir = Path(__file__).resolve().parent
    rf_model_path = model_dir / "traffic_model.pkl"
    lstm_model_path = model_dir / "lstm_model.h5"
    scaler_path = model_dir / "scaler.pkl"

    df = pd.read_csv(data_path)

    # ---------------- RF accuracy (traffic_level classification) ----------------
    if not rf_model_path.exists():
        raise FileNotFoundError("RF model not found. Run: python app/model/train_model.py")
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
    rf_accuracy = accuracy_score(y_test_rf, rf_pipeline.predict(X_test_rf))

    # ---------------- LSTM loss / MSE (traffic_score regression) ----------------
    if not lstm_model_path.exists() or not scaler_path.exists():
        raise FileNotFoundError(
            "LSTM model/scaler not found. Run: python app/model/train_lstm.py"
        )

    lstm_df = df.copy()
    lstm_df["datetime"] = pd.to_datetime(lstm_df["datetime"], errors="coerce")
    lstm_df = lstm_df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)

    features = ["hour", "month", "is_weekend", "is_holiday", "days_to_holiday", "traffic_score"]
    for col in features:
        lstm_df[col] = pd.to_numeric(lstm_df[col], errors="coerce")
    lstm_df[features] = lstm_df[features].fillna(lstm_df[features].median(numeric_only=True))

    preprocess = joblib.load(scaler_path)
    scaler = preprocess["scaler"]
    window_size = preprocess["window_size"]
    target_idx = preprocess["target_index"]

    scaled_data = scaler.transform(lstm_df[features].to_numpy(dtype=np.float32))

    X_lstm, y_lstm = [], []
    for i in range(window_size, len(scaled_data)):
        X_lstm.append(scaled_data[i - window_size:i])
        y_lstm.append(scaled_data[i, target_idx])
    X_lstm = np.array(X_lstm, dtype=np.float32)
    y_lstm = np.array(y_lstm, dtype=np.float32)

    split_idx = int(len(X_lstm) * 0.8)
    X_test_lstm = X_lstm[split_idx:]
    y_test_lstm = y_lstm[split_idx:]
    y_test_levels = lstm_df["traffic_level"].to_numpy()[window_size + split_idx:]

    lstm_model = load_model(lstm_model_path, compile=False)
    y_pred_lstm = lstm_model.predict(X_test_lstm, verbose=0).reshape(-1)

    lstm_mse = mean_squared_error(y_test_lstm, y_pred_lstm)
    # Equivalent to evaluation loss (MSE) in this setup.
    lstm_loss = float(lstm_mse)

    # Optional: convert LSTM predictions to traffic_level and evaluate classification accuracy.
    pred_levels = []
    for pred_scaled in y_pred_lstm:
        row = np.zeros((1, len(features)), dtype=np.float32)
        row[0, target_idx] = pred_scaled
        score = scaler.inverse_transform(row)[0, target_idx]
        pred_levels.append(score_to_level(float(score)))
    lstm_level_accuracy = accuracy_score(y_test_levels, pred_levels)

    print("=== Model Comparison ===")
    print(f"Random Forest Accuracy: {rf_accuracy * 100:.2f}%")
    print(f"LSTM MSE: {lstm_mse:.6f}")
    print(f"LSTM Loss (MSE): {lstm_loss:.6f}")
    print(f"LSTM Classification Accuracy: {lstm_level_accuracy * 100:.2f}%")


if __name__ == "__main__":
    compare_models()
