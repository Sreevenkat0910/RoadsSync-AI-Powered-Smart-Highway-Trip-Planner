from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler


def create_sequences(data, window_size=5):
    """
    data: scaled ndarray [n_samples, n_features]
    returns:
      X: [n_sequences, window_size, n_features]
      y: [n_sequences] -> next timestep's scaled traffic_score column
    """
    X, y = [], []
    target_idx = -1  # traffic_score is last column
    for i in range(window_size, len(data)):
        X.append(data[i - window_size:i])
        y.append(data[i, target_idx])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def main():
    from tensorflow.keras import Sequential
    from tensorflow.keras.layers import Dense, Input, LSTM

    project_root = Path(__file__).resolve().parents[3]
    data_path = project_root / "data" / "traffic.csv"
    model_dir = Path(__file__).resolve().parent
    model_path = model_dir / "lstm_model.h5"
    scaler_path = model_dir / "scaler.pkl"

    df = pd.read_csv(data_path)
    if "datetime" not in df.columns:
        raise ValueError("traffic.csv must contain 'datetime' column")

    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df = df.dropna(subset=["datetime"]).sort_values("datetime").reset_index(drop=True)

    # Numerical-only feature set for stable first LSTM baseline.
    features = ["hour", "month", "is_weekend", "is_holiday", "days_to_holiday", "traffic_score"]
    for col in features:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[features] = df[features].fillna(df[features].median(numeric_only=True))

    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(df[features].to_numpy(dtype=np.float32))

    window_size = 5
    X, y = create_sequences(scaled_data, window_size=window_size)
    if len(X) < 10:
        raise ValueError("Not enough sequence data to train LSTM.")

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    num_features = X_train.shape[2]
    model = Sequential([
        Input(shape=(window_size, num_features)),
        LSTM(64, return_sequences=True),
        LSTM(32),
        Dense(16, activation="relu"),
        Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")

    history = model.fit(
        X_train,
        y_train,
        epochs=15,
        batch_size=32,
        validation_data=(X_test, y_test),
        verbose=1,
    )

    print(f"Final training loss: {history.history['loss'][-1]:.6f}")
    print(f"Final validation loss: {history.history['val_loss'][-1]:.6f}")

    model.save(model_path)
    joblib.dump(
        {
            "scaler": scaler,
            "window_size": window_size,
            "features": features,
            "target_index": features.index("traffic_score"),
        },
        scaler_path,
    )
    print(f"Saved model to: {model_path}")
    print(f"Saved scaler to: {scaler_path}")

    # Validation preview: sample predictions vs actual (inverse-scaled).
    pred_scaled = model.predict(X_test, verbose=0).reshape(-1)
    target_index = features.index("traffic_score")

    actual_scores = []
    predicted_scores = []
    for idx in range(len(pred_scaled)):
        base_row_actual = np.zeros((1, len(features)), dtype=np.float32)
        base_row_pred = np.zeros((1, len(features)), dtype=np.float32)
        base_row_actual[0, target_index] = y_test[idx]
        base_row_pred[0, target_index] = pred_scaled[idx]
        actual = scaler.inverse_transform(base_row_actual)[0, target_index]
        pred = scaler.inverse_transform(base_row_pred)[0, target_index]
        actual_scores.append(float(actual))
        predicted_scores.append(float(pred))

    print("Sample predictions vs actual (traffic_score):")
    for i in range(min(5, len(actual_scores))):
        print(f"  Pred: {predicted_scores[i]:.2f} | Actual: {actual_scores[i]:.2f}")


if __name__ == "__main__":
    main()
