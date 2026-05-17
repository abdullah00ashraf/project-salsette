# Sentinel V7 Mumbai Coastal Defense System
## Project Architecture & Deep Dive Analysis

This document provides a comprehensive, deep-dive analysis of the **Sentinel V7 (HUFP_mumbai)** project. It details the module architecture, data pipelines, neural network configurations, and the "AEGIS Auditor" system designed to forecast and audit hydraulic locks and flood depths in Mumbai.

---

## 1. System Overview

Sentinel V7 is a high-security, physics-informed flood prediction and citizen telemetry system tailored for the complex topography and coastal dynamics of Mumbai. It fuses large-scale static geospatial grids (elevation, landcover, slope) with dynamic meteorological (Open-Meteo) and oceanic (Tidal harmonic) data. 

At its core, it employs a massive **>10-Million parameter Physics-Informed Neural Network (PINN)** wrapped in an **AEGIS Auditor architecture** that validates the neural predictions against hard physics (mass balance, hydraulic lock laws) to prevent hallucinations.

---

## 2. Directory Structure & Module Breakdown

The project is structured into distinct pipelines spanning data engineering, neural networks, auditing, secure APIs, and frontend interfaces:

```text
HUFP_mumbai/
├── 01 to 07 Scripts   # Big Data Extraction & Fusion Pipeline
├── aegis_auditor/     # The "Judge/Jury" Epistemic Humility Validation Engine
├── api/               # FastAPI Backend with Secure Neural Ignition
├── data/              # Raw & Processed Datasets (Weather, Tides, Parquet)
├── deployment/        # Docker and CI/CD pipelines
├── iot/               # Edge compute security (C++ & Nginx)
├── src/               # PINN Core & Training Logic
└── web/               # Tactical HUDs (Citizen & Expert)
```

---

## 3. Data Engineering Pipeline (Root Scripts)

The root directory contains a 7-step data ingestion and fusion pipeline designed to process petabytes of raw data using chunked memory management.

- **`01_init_mumbai_grid.py` to `06_build_master_grid.py`**: These scripts extract the static 100m topological grid of Mumbai (via `mumbai_100m_grid.geojson`), fetch historical weather data, compute tide harmonics, and align the spatial targets.
- **`07_final_fusion.py`**: The Master Fusion Engine. It takes the 216,284-cell static grid and streams hourly weather and tide data to disk using `pyarrow` and Parquet. It calculates topographic slope, aligns timestamps, and writes out compressed Parquet files year-by-year, strictly limiting RAM usage to prevent out-of-memory crashes.
- **`08_live_telemetry_daemon.py`**: The Zero-Latency Live Ingestion Daemon. An asynchronous `aiohttp` script that continuously polls Open-Meteo precipitation and marine APIs every 5 minutes. It fuses real-time data and appends it to a chunked `live_telemetry.parquet` dataset without blocking the main event loops.

---

## 4. The `src` Module: Neural Core (PINN)

The `src` directory houses the actual AI models, focused on a Physics-Informed approach.

### `src/models/bi_lstm_mumbai_v1.py`
This defines the `SentinelMumbaiPINN`—the engine of Sentinel V7.
- **Architecture**: A Deep Bi-Directional LSTM (6 layers, 512 hidden units per direction) paired with a Self-Attention Head and a fully connected decoder. It boasts **>10,000,000 active parameters**.
- **Physics-Informed Loss Function (`PINN_Loss`)**: The loss function combines a data-driven Log-Cosh loss with a massive physics penalty. If the model predicts no flood while the tidal height and rainfall exceed a "hydraulic lock" threshold, it applies a massive ReLU penalty. This forces the model to respect the law of mass conservation.

### Training Scripts (`train_mumbai_pinn.py`, `hybrid_train_pinn.py`)
These scripts train the deep Bi-LSTM against the Parquet dataset and synthesize scenarios using `hydraulic_lock_generator.py` to ensure the neural net is robust to anomalous "black swan" flood events.

---

## 5. The `aegis_auditor` Module: Judge & Jury Overseer

Because deep neural networks can hallucinate, Sentinel V7 employs an **AEGIS (Anti-Gravity Environment for Global Infrastructure Sentinel)** Auditor. This is a multi-agent validation layer.

### `judge_overseer.py` (The Synthesis Layer)
The Judge orchestrates the execution of 6 independent suites. It dynamically allocates compute time based on storm severity (e.g., allocating 5.0 seconds to Predictor/Historian during high-severity storms). It calculates the final **`V_audit`** formulation: checking the neural output against `L_Physics.validate_mass_balance()`.

### The 6 Independent Suites (`suites/`)
1. **S1 (Interrogator)**: Checks for logical fallacies (e.g., if the PINN says "safe" but rainfall is >100mm and tide is >4.5m, it raises a logic fault).
2. **S2 (Watchdog)**: Monitors execution latency and computational bounds.
3. **S3 (Analyst)**: Performs statistical analysis on the input vectors.
4. **S4 (Predictor)**: Evaluates transit gridlock and muck-factor calculus using an independent heuristic.
5. **S5 (Historian)**: Performs temporal anchoring, checking current metrics against the 2005 Mumbai flood profile. Raises `HistoricalIgnorance` if the threat is undervalued.
6. **S6 (Telemetry)**: Validates incoming IoT and Citizen pin data streams.

---

## 6. The `api` Module: Secure Backend

Built with FastAPI, the `api/main.py` is the nervous system connecting the model to the outside world.

- **Secure Neural Ignition (Lifespan Phase)**: The model weights (`sentinel_mumbai_v1_cloud.pt`) are stored encrypted. During server startup, the system fetches the Data Encryption Key (DEK) via `vault_manager.py`, decrypts the model into memory via AES-GCM, seats the neural core, and then cryptographically shreds the DEK from RAM using `memory_utils.secure_zero()`.
- **Dual-Framework "Shadow Run" Backend**: Alongside the PyTorch core, the lifespan event now loads a compiled Keras model (`v7_latest_brain.keras`). An internal `asyncio` background task tails the `live_telemetry.parquet` file every 5 minutes, runs a Keras inference pass to predict hydraulic locks, silently logs the matrix to an `aegis_audit.db` SQLite database, and broadcasts the probability to the frontend via a `/ws/telemetry` WebSocket endpoint.
- **Inference Endpoints**: `/api/v1/inference` receives telemetry vectors, passes them through the `sentinel_core` tensor, and returns hydraulic lock probabilities and flood depths.
- **Session & Security**: Features JWT-based session auth (`/api/v1/auth/session`) and payload integrity middleware (`security_middleware.py`) to prevent replay attacks and tampering.
- **Emergency Routes**: Endpoints for Citizen Pins and Emergency Beacons to crowd-source ground-truth data, directly interfacing with `coastal_db.py`.

---

## 7. The `web` Module: Tactical HUD Interfaces

The frontend is divided into two distinct Glassmorphic/Cybernetic UIs:
- **`web/citizen/`**: Designed for public use. Features a 3D-interactive, draggable "Survival Suite" cube (`SurvivalSuite.jsx` React component that monitors real-time WebSocket telemetry and triggers CSS emergency states), cinematic cosmic descent intro (`intro.html`), and live dashboards to warn citizens of hydraulic locks.
- **`web/admin/` (Expert Console)**: A hyper-detailed dashboard designed for hydrologists and civil engineers, displaying bayesian uncertainty, basin yield, aleatoric noise, and SAR backscatter histories (`expert.html`).

---

## 8. Deployment and Edge (`deployment/`, `iot/`)

- **Dockerization**: The ecosystem is containerized via `docker-compose.yml`.
- **Edge Security**: `iot/edge_security.cpp` executes a robust `EVP_aes_256_gcm` OpenSSL algorithm. It encrypts physical JSON telemetry from hardware sensors with a hardcoded DEK, extracts the mathematically binding Authentication Tag natively, and packages the IV, Ciphertext, and Auth Tag into a Base64 string to definitively prevent "Ghost Rain" injection attacks. 
- **Nginx**: A robust `nginx.conf` acts as the reverse proxy, shielding the Uvicorn workers and managing secure SSL/TLS termination.

---
**Summary Statement**: Sentinel V7 is a production-grade, highly secure, physics-constrained AI ecosystem. It bridges the gap between massive data engineering, deep learning, and epistemic auditing to provide an ultra-reliable, tamper-proof flood management platform.
