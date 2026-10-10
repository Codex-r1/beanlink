
import os
import joblib
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor

CSV_PATH = r'C:\Users\roche\Downloads\bean_input_trials_2010_2012_unified.csv'
MODEL_PATH = 'models/bean_model.pkl'

CATEGORICAL = ['variety', 'fertilizer_treatment', 'lime_treatment', 'inoculation', 'season']
TARGET = 'yield_gain_kg_ha'

# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------
df = pd.read_csv(CSV_PATH)
df = df.dropna(subset=[TARGET]).reset_index(drop=True)
print(f"Loaded {len(df)} rows from {df['experiment_id'].nunique()} experiments")

# ---------------------------------------------------------------------------
# Build and fit the pipeline (variant B: no soil features)
# ---------------------------------------------------------------------------
preprocessor = ColumnTransformer(
    transformers=[('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL)]
)

pipeline = Pipeline([
    ('preprocess', preprocessor),
    ('regressor', RandomForestRegressor(
        n_estimators=300,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )),
])

pipeline.fit(df[CATEGORICAL], df[TARGET])
print("Model trained")

# ---------------------------------------------------------------------------
# Metadata the serving layer needs
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

print(f"sklearn version: {metadata['sklearn_version']}")
print(f"Varieties: {metadata['variety_options']}")
print(f"Seasons:   {metadata['season_options']}")
print(f"Fertilizers: {len(metadata['fertilizer_options'])} options")

# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------
os.makedirs('models', exist_ok=True)
joblib.dump({'pipeline': pipeline, 'metadata': metadata}, MODEL_PATH)
size_kb = os.path.getsize(MODEL_PATH) / 1024
print(f"\nSaved {MODEL_PATH} ({size_kb:.1f} KB)")