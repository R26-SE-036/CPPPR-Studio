<div align="center">
  <h1>🚀 PairPath</h1>
  <p><strong>An AI-Powered, Adaptive Pair Programming Platform for Novice Coders</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql)](https://www.postgresql.org/)
  [![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange)](https://xgboost.readthedocs.io/)
</div>

<br />

## 📖 Project Overview

**PairPath** is an advanced collaborative learning environment designed specifically to teach programming to novices through **structured pair programming**. 

Traditional pair programming often fails when two novices are paired together because they lack the expertise to guide each other out of a struggle (the "blind leading the blind" problem). PairPath solves this by introducing a **Machine Learning-driven Adaptive Intervention System**. 

The platform monitors student behavior in real-time (typing cadence, error rates, communication metrics) and uses an **XGBoost model** to classify their collaborative state (e.g., `PRODUCTIVE`, `LOGIC_STRUGGLE`, `PASSIVE_NAVIGATOR`). If a negative state is detected, the platform triggers a **Retrieval-Augmented Generation (RAG) engine** to step in as a "Virtual Tutor," delivering highly contextual hints, nudges, and concept reminders without giving away the final answer.

### 🎯 Target Audience & Goals
- **Target Audience:** University students or coding boot-camp attendees learning Java (or other introductory languages).
- **Goal:** To enforce healthy collaborative habits (Driver/Navigator roles) and reduce the frustration of getting stuck, leading to higher completion rates and better conceptual understanding.

---

## ✨ Key Features

- **💻 Real-Time Collaborative Workspace:** A synchronized Monaco code editor, live terminal output, and integrated WebSockets for seamless remote pairing.
- **🧠 ML Behavior Analysis:** Continuously evaluates 8 distinct behavioral features over 3-minute sliding windows to predict the pair's state with high accuracy.
- **🤖 RAG-Powered Virtual Tutor:** Dynamically fetches relevant programming concepts based on the pair's current code and compiler errors to provide actionable hints.
  - **RAG-lite Pipeline:**
    1. Load local Java and collaboration knowledge files.
    2. Retrieve top relevant chunks using keyword scoring (concept tags, error context, code keywords).
    3. Generate structured, scaffolded help without giving away final solutions.
    4. Return a highly contextual `conceptReminder`, `exampleIdea`, and `reflectiveQuestion`.
- **📊 Analytics & Dashboards:** Extensive data logging allows instructors to review session timelines, interventions triggered, and student performance metrics.
- **🔄 Role Enforcement:** Built-in UI mechanics that encourage students to switch between the "Driver" and "Navigator" roles to maintain engagement.

---

## 🏗️ High-Level Architecture

The platform operates on a modern microservices architecture to ensure scalability and separation of concerns:

1. **Frontend (`/frontend`)**: A **Next.js (React)** application utilizing TailwindCSS for the user interface, Liveblocks/Socket.io for state sync, and Axios for API communication.
2. **API Backend (`/api`)**: A **NestJS (Node.js)** server handling core business logic, user authentication (JWT), code execution routing, and PostgreSQL database management via **Prisma ORM**.
3. **ML Service (`/ml-service`)**: A **FastAPI (Python)** service that hosts the pre-trained XGBoost classification model and the LangChain/LlamaIndex RAG retrieval engine.

---

## 📂 Complete Folder Structure

```text
PairPath/
├── .gitignore                   # Global ignore file for OS/IDE artifacts
├── README.md                    # This complete project documentation file
│
├── api/                         # 🟢 NestJS Backend Server (Port 3001)
│   ├── .env                     # Database connection string and secrets
│   ├── .gitignore               # Ignores dist/ and node_modules/
│   ├── package.json             # Node.js dependencies
│   ├── prisma.config.ts         # Prisma ORM setup
│   │
│   ├── prisma/                  # Database Schema and Seeding
│   │   ├── schema.prisma        # PostgreSQL Database Schema definition
│   │   ├── seed-50-sessions.js  # Script to populate DB with 50 mock sessions for analytics
│   │   └── seeds.ts             # Base database seeder for topics, users, etc.
│   │
│   └── src/                     # NestJS Source Code
│       ├── app.module.ts        # Root module importing all service modules
│       ├── main.ts              # Entry point for the backend server
│       ├── common/              # Shared utilities and Prisma Service
│       └── modules/             # Business Logic Modules
│           ├── auth/            # JWT Authentication
│           ├── code-runner/     # Code execution integration
│           ├── interventions/   # Intervention tracking and logic
│           ├── ml/              # Bridge to Python ML Service
│           ├── questions/       # Programming question management
│           ├── sessions/        # Pair programming session management (includes Analytics)
│           ├── topics/          # Subject/Topic management
│           └── websocket/       # Socket.io gateway for real-time collaboration
│
├── frontend/                    # 🔵 Next.js React Client (Port 3000)
│   ├── .gitignore               # Ignores .next/ and node_modules/
│   ├── package.json             # React/Next.js dependencies
│   ├── tailwind.config.js       # Tailwind CSS styling tokens
│   │
│   └── src/                     # React Source Code
│       ├── components/          # Reusable UI components
│       ├── hooks/               # Custom React hooks (e.g., useAuth)
│       ├── lib/                 # Utility functions and Axios API client
│       └── app/                 # Next.js App Router Pages
│           ├── globals.css      # Global Tailwind styles
│           ├── layout.tsx       # Root layout component
│           ├── dashboard/       # Main user dashboard
│           ├── ml-analytics/    # Dashboard to visualize historical session timelines
│           ├── ml-sandbox/      # Developer tool to test ML model sliders in real-time
│           ├── pair/[id]/       # Live collaborative pair programming environment
│           └── review/[id]/     # Peer review submission page
│
└── ml-service/                  # 🟣 Python FastAPI & ML Engine (Port 8000)
    ├── .gitignore               # Ignores pycache and venv
    ├── requirements.txt         # Python pip dependencies
    │
    ├── app/                     # FastAPI Server Code
    │   ├── main.py              # FastAPI entry point and routes
    │   └── models/              # Inference Logic
    │       ├── intervention_engine.py # Maps states to specific UI actions
    │       ├── predictor.py           # XGBoost feature parsing and prediction
    │       └── rag_retriever.py       # RAG logic for retrieving hints
    │
    ├── data/                    # Datasets and Features
    │   ├── raw_sessions/        # Raw mock session JSON data
    │   └── splits/              # Train, Validation, and Test CSV splits
    │
    ├── dev_tools/               # Model Training and Dataset Scripts
    │   ├── build_dataset.py     # Feature extraction from raw sessions
    │   ├── generate_mock_sessions.py # Synthesizes mock behavioral data
    │   └── train_xgboost.py     # Specific XGBoost training pipeline
    │
    └── models/                  # Serialized Trained Models (Joblib)
        ├── pair_state_feature_columns.joblib
        └── pair_state_xgboost.joblib
```

---

## 🚀 Getting Started

To run PairPath locally, you must run all three microservices concurrently.

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL Database (Local or Cloud)

### 1. Start the API Backend (NestJS)
```bash
cd api
npm install
# Set up your .env file with DATABASE_URL
npx prisma generate
npm run start:dev
```
*Runs on `http://localhost:3001`*

### 2. Start the ML Service (FastAPI)
```bash
cd ml-service
pip install -r requirements.txt
python -m app.main
```
*Runs on `http://localhost:8000`*

### 3. Start the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:3000`*

---

## 🧪 Demonstration Dashboards
For evaluators and developers, two built-in demonstration tools are available via the main homepage (`http://localhost:3000`):
- **ML Sandbox (`/ml-sandbox`)**: A developer console to manually adjust the 8 behavioral sliders (like Edit Balance and Error Recovery Time) and ping the Python ML service to see real-time state predictions and intervention UI popups.
- **ML Analytics (`/ml-analytics`)**: A historical view that renders chronological timelines of past sessions, demonstrating how 1-minute `PairStatePrediction` blocks are interleaved with raw collaborative events (code edits, chat, and test runs).

---

## 📄 License
This project is licensed under the MIT License.
