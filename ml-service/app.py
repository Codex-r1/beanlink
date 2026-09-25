import os
import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

variety_model = joblib.load('models/variety_model.pkl')
fertilizer_model = joblib.load('models/fertilizer_model.pkl')

FEATURE_COLUMNS = [
    'farming_system', 'seed_size_class', 'soil_fertility_class',
    'altitude_masl', 'annual_rainfall_mm', 'soil_pH', 'temperature_c'
]

@app.route('/health')
def health():
    return jsonify({"status": "ok", "service": "ml-service"})

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({
            "error": "Request body must be valid JSON with Content-Type: application/json"
        }), 400

    missing = [col for col in FEATURE_COLUMNS if col not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    features = pd.DataFrame([{col: data[col] for col in FEATURE_COLUMNS}])

    variety_pred = variety_model.predict(features)[0]
    fertilizer_pred = fertilizer_model.predict(features)[0]

    return jsonify({
        "recommended_variety": variety_pred,
        "recommended_fertilizer": fertilizer_pred,
        "input_summary": data
    })
    data = request.get_json()

    missing = [col for col in FEATURE_COLUMNS if col not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    features = pd.DataFrame([{col: data[col] for col in FEATURE_COLUMNS}])

    variety_pred = variety_model.predict(features)[0]
    fertilizer_pred = fertilizer_model.predict(features)[0]

    
    return jsonify({
        "recommended_variety": variety_pred,
        "recommended_fertilizer": fertilizer_pred,
        "input_summary": data
    })
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(port=port, debug=True)