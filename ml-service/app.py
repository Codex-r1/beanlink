import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return jsonify({"status": "ok", "service": "ml-service"})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(port=port, debug=True)