# BeanLink

**An Agricultural Marketplace and Decision Support System for Smallholder Bean Farmers in Kenya**

BeanLink connects smallholder bean farmers in Kenya to farm inputs, data-driven planting recommendations, produce buyers, and current market price information — in one platform.


---

## What it does

- **Farm input marketplace** — farmers browse and purchase certified seeds, fertilizers, soil amendments, crop protection products, and equipment from verified suppliers.
- **ML-powered input recommendation** — a Random Forest model recommends the most suitable bean variety and fertilizer based on a farmer's altitude, rainfall, soil pH, soil fertility, and other farm-context data, with SHAP-based explanations for each recommendation.
- **Bean produce marketplace** — farmers list harvested beans by variety, quantity, grade, and price; buyers browse, filter, and place orders.
- **Market price dashboard** — recorded (not predicted) current and historical bean prices across Kenyan markets, sourced from admin-verified entries.
- **Order & transaction management** — tracked status across the full lifecycle: pending → confirmed → processing → completed/cancelled.
- **Role-based access** — Farmer, Buyer, Supplier, and Admin roles, each with a scoped set of permissions.

| Layer | Technology | Role |
|---|---|---|
| Frontend | React + Tailwind | Farmer/buyer/supplier/admin interfaces |
| API Gateway | Node.js + Express | Auth, RBAC, routing, orchestration |
| ML Service | Python + Flask, scikit-learn, SHAP | Serves the trained recommendation models |
| Database | Supabase (PostgreSQL) | Users, listings, transactions, recommendations, price records |

## Project structure

```
beanlink/
├── frontend/          # React application
├── api-gateway/       # Node.js/Express backend — auth, marketplace, orders
├── ml-service/        # Flask microservice — serves trained Random Forest models
│   ├── models/        # Trained .pkl model files
│   ├── data/           # Raw and processed training data
│   └── app.py
├── database/          # Schema DDL and seed data
└── docs/              # Diagrams and supporting documentation
```

## Getting started

### Prerequisites

- Node.js 20.x
- Python 3.12
- A Supabase project (or any PostgreSQL instance)

### 1. Clone the repo

```bash
git clone https://github.com/Codex-r1/beanlink.git
cd beanlink
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

### 3. API Gateway

```bash
cd api-gateway
npm install
cp .env.example .env   # then fill in your own values
npm run dev
```
Runs at `http://localhost:5000`. Health check: `GET /health`, `GET /health/db`.

### 4. ML Service

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
python app.py
```
Runs at `http://localhost:5001`. Health check: `GET /health`. Recommendation endpoint: `POST /recommend`.

### 5. Database

Run the schema in `database/schema.sql` against your Supabase project's SQL editor to create all tables.

## Machine learning

The input-recommendation model is a Random Forest classifier trained on a KALRO-guideline-derived dataset (farm altitude, rainfall, soil pH, soil fertility class, farming system → recommended bean variety and fertilizer). Training, cross-validation, hyperparameter tuning, and SHAP explainability were carried out in Google Colab; trained models are exported as `.pkl` files and served by the Flask microservice. See `ml-service/models/` and the project report (Chapter 4/5) for full methodology and evaluation results.

## Development workflow

This project follows a sprint-based Git workflow:
- `main` — stable, demo-ready code
- `dev` — active integration branch
- `feature/*` — one branch per unit of work, merged into `dev` when complete

