import os
import joblib
import pandas as pd
import numpy as np
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import mean_absolute_error, mean_squared_error

CSV_PATH = r'C:\Users\roche\Downloads\bean_input_trials_2010_2012_unified.csv'
MODEL_PATH = 'models/bean_model.pkl'

CATEGORICAL = ['variety', 'fertilizer_treatment', 'lime_treatment', 'inoculation', 'season']
TARGET = 'yield_gain_kg_ha'

# ---------------------------------------------------------------------------
# Load Data
# ---------------------------------------------------------------------------
df = pd.read_csv(CSV_PATH)
df = df.dropna(subset=[TARGET]).reset_index(drop=True)
print(f"Loaded {len(df)} rows from {df['experiment_id'].nunique()} experiments\n")

# ---------------------------------------------------------------------------
# EVALUATION (Leave-One-Experiment-Out Cross Validation)
# ---------------------------------------------------------------------------
logo = LeaveOneGroupOut()
y_true = []
y_pred_ml = []
y_pred_base = []

print("Running Leave-One-Experiment-Out Cross-Validation...")
for train_idx, test_idx in logo.split(df, groups=df['experiment_id']):
    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]
    
    # 1. Train the ML Pipeline on this fold
    temp_pipeline = Pipeline([
        ('preprocess', ColumnTransformer([('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL)])),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    ])
    temp_pipeline.fit(train_df[CATEGORICAL], train_df[TARGET])
    
    # 2. Predict on the unseen experiment
    preds = temp_pipeline.predict(test_df[CATEGORICAL])
    
    # 3. Calculate the simple Baseline (Average yield gain of that fertilizer in training data)
    baseline_means = train_df.groupby('fertilizer_treatment')[TARGET].mean()
    # Fill missing fertilizers with the global training mean
    global_mean = train_df[TARGET].mean()
    baseline_preds = test_df['fertilizer_treatment'].map(baseline_means).fillna(global_mean)
    
    y_true.extend(test_df[TARGET])
    y_pred_ml.extend(preds)
    y_pred_base.extend(baseline_preds)

# Print Evaluation Results
print("\n--- MODEL EVALUATION (Unseen Experiments) ---")
print(f"ML Model MAE:        {mean_absolute_error(y_true, y_pred_ml):.1f} kg/ha")
print(f"Baseline (Avg) MAE:  {mean_absolute_error(y_true, y_pred_base):.1f} kg/ha")

print(f"ML Model RMSE:       {np.sqrt(mean_squared_error(y_true, y_pred_ml)):.1f} kg/ha")
print(f"Baseline (Avg) RMSE: {np.sqrt(mean_squared_error(y_true, y_pred_base)):.1f} kg/ha")
print("---------------------------------------------\n")

# ---------------------------------------------------------------------------
# FINAL MODEL TRAINING (On all data for deployment)
# ---------------------------------------------------------------------------
print("Training final model on all data...")

preprocessor = ColumnTransformer(
    transformers=[('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL)]
)

final_pipeline = Pipeline([
    ('preprocess', preprocessor),
    ('regressor', RandomForestRegressor(
        n_estimators=300,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )),
])

final_pipeline.fit(df[CATEGORICAL], df[TARGET])
print("Final model trained.")

# ---------------------------------------------------------------------------
# Save Model & Metadata
# ---------------------------------------------------------------------------
metadata = {
    'fertilizer_options': sorted(df['fertilizer_treatment'].unique().tolist()),
    'lime_options': sorted(df['lime_treatment'].unique().tolist()),
    'inoculation_options': sorted(df['inoculation'].unique().tolist()),
    'variety_options': sorted(df['variety'].unique().tolist()),
    'season_options': sorted(df['season'].unique().tolist()),
    'feature_cols': CATEGORICAL,
    'target': TARGET,
    'sklearn_version': sklearn.__version__,
}

os.makedirs('models', exist_ok=True)
joblib.dump({'pipeline': final_pipeline, 'metadata': metadata}, MODEL_PATH)
size_kb = os.path.getsize(MODEL_PATH) / 1024
print(f"\nSaved {MODEL_PATH} ({size_kb:.1f} KB)")