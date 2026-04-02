from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def main():
    project_root = Path(__file__).resolve().parents[3]
    data_path = project_root / "data" / "traffic.csv"
    model_path = Path(__file__).resolve().parent / "traffic_model.pkl"

    df = pd.read_csv(data_path)

    # Keep training feature set aligned with inference inputs.
    feature_columns = [
        "hour",
        "day_of_week",
        "month",
        "is_weekend",
        "is_holiday",
        "days_to_holiday",
        "route",
    ]
    target_column = "traffic_level"

    missing = [col for col in feature_columns + [target_column] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    df = df[feature_columns + [target_column]].copy()

    # Handle missing values.
    numeric_cols = ["hour", "month", "is_weekend", "is_holiday", "days_to_holiday"]
    categorical_cols = ["day_of_week", "route"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in categorical_cols + [target_column]:
        df[col] = df[col].astype("string")

    X = df[feature_columns]
    y = df[target_column]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                    ]
                ),
                numeric_cols,
            ),
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            ),
        ]
    )

    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced_subsample",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {accuracy:.4f}")

    artifact = {
        "pipeline": pipeline,
        "feature_columns": feature_columns,
        "target_classes": sorted(y.dropna().unique().tolist()),
    }
    joblib.dump(artifact, model_path)
    print(f"Saved model artifact to: {model_path}")


if __name__ == "__main__":
    main()
