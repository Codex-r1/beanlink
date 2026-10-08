import os
import itertools
import joblib
import pandas as pd
import shap
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Load the model bundle produced by train.py.
# Expected shape: { 'pipeline': Pipeline, 'metadata': { ... } }
# ---------------------------------------------------------------------------
MODEL_PATH = os.getenv('MODEL_PATH', 'models/bean_model.pkl')
bundle = joblib.load(MODEL_PATH)
pipeline = bundle['pipeline']
META = bundle['metadata']

preprocessor = pipeline.named_steps['preprocess']
regressor = pipeline.named_steps['regressor']
explainer = shap.TreeExplainer(regressor)

FEATURE_COLS = META['feature_cols']
print(f"Loaded model. sklearn={META.get('sklearn_version')}")
print(f"Varieties: {META['variety_options']}")
print(f"Seasons:   {META['season_options']}")


# ---------------------------------------------------------------------------
# Friendly names for the explanation card
# ---------------------------------------------------------------------------
FEATURE_LABELS = {
    'variety': 'Bean variety',
    'fertilizer_treatment': 'Fertilizer',
    'lime_treatment': 'Lime',
    'inoculation': 'Seed treatment',
    'season': 'Season',
}


# ---------------------------------------------------------------------------
# Friendly names for the treatment values
# ---------------------------------------------------------------------------
LIME_LABELS = {
    'With lime': 'Add lime',
    'Without lime': 'No lime',
}

INOCULATION_LABELS = {
    'Inoculated': 'Treat seed with inoculant',
    'Not inoculated': 'Seed not treated',
}

FERTILIZER_LABELS = {
    'NONE': 'No fertilizer',
}


# ---------------------------------------------------------------------------
# Variety mapping: KALRO research line -> market name farmers know
# ---------------------------------------------------------------------------
VARIETY_DISPLAY = {
    'Kenya Umoja': {
        'market': 'Rosecoco',
        'code': 'KAT B1',
        'label': 'Rosecoco (Kenya Umoja · KAT B1)',
    },
    'Kenya Tamu': {
        'market': 'Wairimu',
        'code': 'MAC 34',
        'label': 'Wairimu / Sugar (Kenya Tamu · MAC 34)',
    },
    'RWV Variety': {
        'market': 'Mwitemania',
        'code': 'RWV',
        'label': 'Mwitemania (RWV variety)',
    },
}


def friendly_fertilizer(name):
    return FERTILIZER_LABELS.get(name, name)


def friendly_lime(name):
    return LIME_LABELS.get(name, name)


def friendly_inoculation(name):
    return INOCULATION_LABELS.get(name, name)


def variety_display(value):
    return VARIETY_DISPLAY.get(value, {
        'market': value,
        'code': '',
        'label': value,
    })


# ---------------------------------------------------------------------------
# Build the full grid of input packages we consider for a request
# ---------------------------------------------------------------------------
def build_candidates(variety, season):
    rows = []
    for fert, lime, inoc in itertools.product(
        META['fertilizer_options'],
        META['lime_options'],
        META['inoculation_options'],
    ):
        rows.append({
            'variety': variety,
            'season': season,
            'fertilizer_treatment': fert,
            'lime_treatment': lime,
            'inoculation': inoc,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# SHAP — top positive contributions for a single row
# ---------------------------------------------------------------------------
def explain_row(row_df, top_n=4):
    X = preprocessor.transform(row_df)
    if hasattr(X, 'toarray'):
        X = X.toarray()
    sv = explainer.shap_values(X)[0]
    names = preprocessor.get_feature_names_out()

    pairs = [(n, float(v)) for n, v in zip(names, sv) if v > 0]
    pairs.sort(key=lambda x: -x[1])
    pairs = pairs[:top_n]

    out = []
    for name, val in pairs:
        stripped = name.split('__', 1)[1]
        for base, label in FEATURE_LABELS.items():
            if stripped.startswith(base + '_'):
                category = stripped[len(base) + 1:]

                if base == 'lime_treatment':
                    display = friendly_lime(category)
                elif base == 'inoculation':
                    display = friendly_inoculation(category)
                elif base == 'fertilizer_treatment':
                    display = friendly_fertilizer(category)
                elif base == 'variety':
                    display = variety_display(category)['market']
                else:
                    display = category

                out.append({
                    'factor': f"{label}: {display}",
                    'weight': round(val / 500.0, 3),
                    'rawImpact': round(val, 1),
                })
                break
    return out


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'service': 'beanlink-ml',
        'sklearn_version': META.get('sklearn_version'),
        'varieties': META['variety_options'],
        'seasons': META['season_options'],
    })


# ---------------------------------------------------------------------------
# The recommendation endpoint
# ---------------------------------------------------------------------------
@app.route('/predict', methods=['POST'])
@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            'error': 'Request must be JSON with Content-Type: application/json'
        }), 400

    variety = data.get('variety')
    season = data.get('season')
    county = data.get('county')  # display only, not fed to model

    if not variety or not season:
        return jsonify({
            'error': 'Please select a bean variety and a season.'
        }), 400

    if variety not in META['variety_options']:
        return jsonify({
            'error': f'We do not have data for "{variety}". Available: {META["variety_options"]}'
        }), 400

    if season not in META['season_options']:
        return jsonify({
            'error': f'Unknown season "{season}". Available: {META["season_options"]}'
        }), 400

    # Score every candidate package
    candidates = build_candidates(variety, season)
    candidates['predicted_gain'] = pipeline.predict(candidates[FEATURE_COLS])
    candidates = candidates.sort_values(
        'predicted_gain', ascending=False
    ).reset_index(drop=True)

    top = candidates.iloc[0]
    runner_ups = candidates.iloc[1:4]

    # SHAP on the top recommendation
    top_row = candidates.iloc[[0]][FEATURE_COLS]
    explanation = explain_row(top_row, top_n=4)

    # Friendly display values
    display = variety_display(variety)
    fert_text = friendly_fertilizer(top['fertilizer_treatment'])
    lime_text = friendly_lime(top['lime_treatment']).lower()
    inoc_text = friendly_inoculation(top['inoculation']).lower()

    summary = (
        f"For {display['market']} beans in the {season.lower()}, the best mix we found is "
        f"{fert_text} fertilizer, {lime_text}, and {inoc_text}."
    )

    return jsonify({
        'recommendation': {
            'seed': variety,
            'seedLabel': display['label'],
            'seedMarket': display['market'],
            'seedCode': display['code'],
            'fertilizer': top['fertilizer_treatment'],
            'fertilizerDisplay': friendly_fertilizer(top['fertilizer_treatment']),
            'soilAmendment': top['lime_treatment'],
            'soilAmendmentDisplay': friendly_lime(top['lime_treatment']),
            'inoculation': top['inoculation'],
            'inoculationDisplay': friendly_inoculation(top['inoculation']),
        },
        'confidence': 'Medium',
        'explanation': explanation,
        'summary': summary,
        'alternatives': [
            {
                'fertilizer': r['fertilizer_treatment'],
                'fertilizerDisplay': friendly_fertilizer(r['fertilizer_treatment']),
                'lime': r['lime_treatment'],
                'limeDisplay': friendly_lime(r['lime_treatment']),
                'inoculation': r['inoculation'],
                'inoculationDisplay': friendly_inoculation(r['inoculation']),
                'predictedGain': round(float(r['predicted_gain']), 0),
            }
            for _, r in runner_ups.iterrows()
        ],
        'disclaimer': (
            "Your actual harvest will depend on your soil, "
            "the weather, and how you manage the crop."
        ),
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(port=port, debug=True)