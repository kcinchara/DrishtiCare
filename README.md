# Retinal Edge Triage
### Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare
**Smart India Hackathon (SIH) Prototype**

---

## 🌟 Executive Summary
**Retinal Edge Triage** is an offline-first, explainable AI-assisted screening and clinical triage system engineered specifically for low-connectivity rural Primary Health Centres (PHCs) and mobile vision screening camps in India.

In rural India, where access to ophthalmologists is severely limited (fewer than 1 specialist per 100,000 citizens), this application enables frontline Accredited Social Health Activists (ASHA) and Healthcare Workers (HCWs) to capture retinal fundus images, evaluate optical quality, execute multi-modal AI screening, visualize granular lesion-level explainability, and seamlessly synchronize with district ophthalmologists for human-in-the-loop review.

> 🩺 **Core Product Principle**: *"AI prediction ≠ final medical diagnosis. The AI provides screening/triage assistance and the doctor/ophthalmologist makes the final clinical decision."*

---

## 🔬 Dataset Decoupling & Model Architecture

To ensure scientific rigor and avoid data leakage, different clinical datasets have strictly isolated roles:

| Dataset | Primary Clinical Role | Model Functionality |
| :--- | :--- | :--- |
| **APTOS 2019 Blindness Detection** | **DR Severity Classification** | Classifies fundus images into ICDR Grades 0 to 4 (No DR, Mild, Moderate, Severe, Proliferative). |
| **IDRiD (Indian Diabetic Retinopathy Image Dataset)** | **Lesion Localization & Detection** | Detects and enumerates focal microvascular lesions: Microaneurysms, Hemorrhages, Hard Exudates, and Soft Exudates. |
| **DRIVE** | **Retinal Vessel Segmentation** | Traces vascular tree morphology, measures vessel visibility, and verifies diagnostic quality. |
| **Messidor-2** | **External Evaluation Benchmark** | Independent clinical validation dataset (**never used for training**) used strictly to evaluate real-world sensitivity, specificity, and ROC-AUC. |

---

## ⚡ Key System Features

1. **Edge Triage & Offline-First Operation**:
   - Built with native browser **IndexedDB** for full offline capability (patient records, image blobs, quality scores, AI inferences, reviews, and referrals).
   - Bi-directional synchronization queue that automatically buffers actions while offline and syncs with the central server upon reconnection.
   - Live connectivity indicator (🟢 Online, 🔴 Offline, 🟡 Syncing) and one-click "Simulate Offline" toggle for hackathon demonstrations.

2. **Automated Computer Vision Quality Gate (OpenCV)**:
   - Evaluates 6 diagnostic parameters before AI screening: Optical Focus, Illumination, Field of View Centration, Glare Artifacts, Vessel Visibility, and Retinal Coverage.
   - Prevents ungradable or blurred images from generating erroneous clinical classifications.

3. **CLAHE Retinal Enhancement**:
   - Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) on the L-channel of LAB color space and bilateral edge-preserving filtering.
   - Features an interactive before/after split comparison slider.

4. **Multi-Modal Explainable AI (XAI)**:
   - **Grad-CAM Activation Heatmaps**: Highlights salient regions influencing severity grades.
   - **IDRiD Lesion Overlays**: Color-coded markers for microaneurysms, hemorrhages, and exudates.
   - **DRIVE Vessel Overlays**: Segmented vascular tree.
   - **Combined Evidence Map**: Grounded multimodal overlay.

5. **Screening Reliability & Integrity Panel**:
   - Synthesizes Image Quality %, AI Confidence %, Lesion Evidence, and Vessel Visibility into an overall AI status (e.g., *🟢 Suitable for Review* vs *⚠ Low Confidence Result*).
   - Includes a *"Why am I being referred?"* visual explanation card connecting DR Grade + DME Risk + Lesion Evidence → Referral.

6. **Ophthalmologist Adjudication Console (Human-in-the-Loop)**:
   - Specialist interface with options to **ACCEPT**, **OVERRIDE** (with clinical reasoning), or **REQUEST RECAPTURE** (with instructions for the frontline worker).

7. **Configurable Risk Triage & Automated Reports**:
   - 3 Triage Tiers: Low Risk (12-month routine check), Medium Risk (3–6 month review), High Risk (Urgent tertiary referral).
   - Generates official clinical PDF screening reports (via ReportLab) with print preview and instant download.
   - Longitudinal DR progression tracking with Recharts.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`

### 1. Backend Setup & Startup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- The backend will start on **`http://127.0.0.1:8000`**
- Interactive Swagger API docs are available at **`http://127.0.0.1:8000/docs`**

### 2. Frontend Setup & Startup
```bash
cd frontend
npm install
npm run dev -- --port 5173 --host 127.0.0.1
```
- The frontend will start on **`http://127.0.0.1:5173`**

---

## 🔑 Demo Accounts

For rapid demonstration, click the demo buttons on `/login` or enter:

| Role | Username | Password | User Profile |
| :--- | :--- | :--- | :--- |
| **Healthcare Worker** | `demo` | `demo123` | Sister Ananya Sharma (Primary Health Centre) |
| **Ophthalmologist** | `doctor` | `doctor123` | Dr. Rajesh Varma, MS (District Hospital) |

---

## 🗺️ Complete 17 Application Routes

| Route | Page Name | Description |
| :--- | :--- | :--- |
| `/login` | **Login / Demo Portal** | Role selector (`HEALTHCARE_WORKER` / `DOCTOR`) with one-click demo login. |
| `/dashboard` | **Clinical Dashboard** | Summary metrics, referable case counters, and recent screenings table. |
| `/welcome` | **Workflow Introduction** | 3 informational cards, DR clinical education, and visual pipeline. |
| `/patient/new` | **Patient Registration (Step 1)** | Demographics, diabetes history, glycemic markers with instant IndexedDB persistence. |
| `/screening/:id/image` | **Image Acquisition (Step 2)** | OD/OS selection, fundus camera capture/upload, and pre-validated sample presets. |
| `/screening/:id/quality` | **Quality Gate (Step 3)** | 6 automated checks (focus, illumination, FoV, glare, vessel, coverage). |
| `/screening/:id/enhancement` | **Image Enhancement (Step 4)**| Interactive before/after split slider for OpenCV CLAHE enhancement. |
| `/screening/:id/analysis` | **AI Orchestration (Step 5)** | Animated microservices analysis pipeline. |
| `/screening/:id/results` | **Screening Results (Step 5)** | 5-level severity scale, DME status, and Screening Reliability Panel. |
| `/screening/:id/explainability`| **Explainability (Step 5)** | Multi-tab XAI viewer (Grad-CAM, IDRiD lesions, DRIVE vessels, Combined). |
| `/screening/:id/review` | **Doctor Review (Step 6)** | Ophthalmologist adjudication console (Accept, Override, Recapture). |
| `/screening/:id/triage` | **Risk Triage (Step 7)** | Low, Medium, and High risk classification with follow-up interval scheduler. |
| `/screening/:id/report` | **Screening Report (Step 8)** | Formal printable clinical report with PDF download. |
| `/history` | **Patient History** | Longitudinal screening search with risk and eye filters. |
| `/patient/:id` | **Patient Detail & Timeline** | Patient demographic profile and Recharts longitudinal DR grade trajectory chart. |
| `/settings` | **Model Validation & Settings** | Messidor-2 external validation metrics, confusion matrix, and protocol rules. |
| `/offline` | **Offline Sync Console** | Local IndexedDB storage inspector, queue health, and manual sync trigger. |

---

## 🧪 Automated Testing
Run the backend test suite:
```bash
cd backend
pytest -v tests/test_api.py
```
All 6 test suites cover authentication, state machine validation, OpenCV quality gate, AI orchestration, doctor review overrides, and sync queue persistence.
