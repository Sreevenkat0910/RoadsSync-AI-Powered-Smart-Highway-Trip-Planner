import numpy as np
import pandas as pd
import shap

from app.utils.model_loader import load_model


def _clean_feature_name(name: str) -> str:
    if "__" in name:
        return name.split("__", 1)[1]
    return name


def explain_prediction(data: dict, top_k: int = 5):
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

    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["model"]
    X_transformed = preprocessor.transform(input_df)
    X_dense = X_transformed.toarray() if hasattr(X_transformed, "toarray") else np.asarray(X_transformed)

    feature_names = preprocessor.get_feature_names_out()

    pred_class = model.predict(X_dense)[0]
    class_labels = list(model.classes_)
    class_index = class_labels.index(pred_class) if pred_class in class_labels else 0

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_dense)

    if isinstance(shap_values, list):
        values_for_class = np.asarray(shap_values[class_index])[0]
    else:
        values = np.asarray(shap_values)
        if values.ndim == 3:
            values_for_class = values[0, :, class_index]
        else:
            values_for_class = values[0]

    impacts = np.abs(values_for_class)
    top_indices = np.argsort(-impacts)[:top_k]

    top_factors = [
        {
            "feature": _clean_feature_name(str(feature_names[idx])),
            "impact": float(impacts[idx]),
        }
        for idx in top_indices
    ]

    return {
        "predicted_class": str(pred_class),
        "top_factors": top_factors,
    }

