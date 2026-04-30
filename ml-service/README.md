# PP1: Trained ML Model Component

## Overview

This component implements a supervised machine learning model for predicting collaboration states in pair programming sessions. The model focuses on collaboration behavior rather than syntax error detection, using real-time behavioral features to classify pairs into five states.

## Architecture

```
pp1-ml-service/
├── app/
│   ├── main.py                    # FastAPI application
│   ├── predictor.py                # XGBoost prediction service
│   ├── feature_extractor.py         # Feature extraction from events
│   ├── intervention_engine.py        # Intervention mapping logic
│   ├── label_mapping.py            # State definitions and mappings
│   ├── model_loader.py             # Model loading management
│   └── schemas/                   # Pydantic models
│       ├── predictions.py
│       ├── interventions.py
│       └── hints.py
├── models/                        # Trained model storage
│   ├── pair_state_xgboost.joblib
│   ├── pair_state_label_encoder.joblib
│   ├── pair_state_feature_columns.joblib
│   └── pair_state_metrics.csv
├── dev_tools/                    # Training and evaluation tools
│   ├── generate_mock_sessions.py    # Mock session generation
│   ├── train_xgboost.py           # Model training pipeline
│   ├── evaluate_model.py          # Model evaluation
│   └── build_dataset.py            # Dataset building
├── data/                         # Data storage
│   ├── raw_sessions/              # Session event logs
│   ├── labels/                     # Manual labels
│   ├── extracted/                  # Processed features
│   └── splits/                     # Train/val/test splits
└── requirements.txt                # Python dependencies
```

## Pair States

The model predicts one of five collaboration states:

| State | Description |
|--------|-------------|
| **PRODUCTIVE** | Both students are actively collaborating well with balanced participation |
| **DRIVER_DOMINANCE** | One student is doing most of the coding for an extended time |
| **PASSIVE_NAVIGATOR** | Navigator is not actively contributing or discussing |
| **LOGIC_STRUGGLE** | Pair is active but stuck due to repeated failures or logic confusion |
| **DISENGAGED** | Both students show low activity or no meaningful progress |

## Feature Extraction

### Core Features (1-minute windows)
- `user1_edit_count_1m`, `user2_edit_count_1m` - Code edits per user
- `edit_balance_ratio_1m` - Balance between users (0.0 = balanced, 1.0 = one user dominates)
- `run_attempts_1m`, `run_success_rate_1m` - Code execution metrics
- `consecutive_failure_count_1m` - Failed runs in sequence
- `idle_ratio_1m` - Percentage of inactive time
- `discussion_note_count_1m` - Communication frequency
- `prompt_count_1m` - System interventions shown
- `active_user_dominance_1m` - Which user is most active
- `backtracking_ratio_1m` - Code deletion frequency
- `progress_trend_1m` - Forward movement indicator

### Rolling Features (3-minute aggregation)
- `user1_edit_count_3m`, `user2_edit_count_3m` - Cumulative edits
- `avg_edit_balance_3m` - Average balance over 3 minutes
- `total_run_attempts_3m`, `avg_run_success_rate_3m` - Execution metrics
- `total_consecutive_failure_count_3m` - Cumulative failures
- `avg_idle_ratio_3m` - Average inactivity
- `total_discussion_note_count_3m` - Total communication
- `avg_active_user_dominance_3m` - Activity distribution

## Model Training

### XGBoost Configuration
- **Algorithm**: XGBoost multi-class classifier
- **Objective**: `multi:softprob` for probability outputs
- **Parameters**:
  - `max_depth=6` - Tree complexity control
  - `learning_rate=0.1` - Learning step size
  - `n_estimators=100` - Number of boosting rounds
  - `subsample=0.8` - Sample fraction for robustness
  - `colsample_bytree=0.8` - Feature sampling control

### Training Pipeline
1. **Data Collection**: Real-time session events → 1-minute windows
2. **Feature Extraction**: Behavioral metrics calculation from event patterns
3. **Data Splitting**: Session-level split (70:15:15 train/val/test)
4. **Model Training**: XGBoost on extracted features
5. **Evaluation**: Accuracy, precision, recall, F1-score, confusion matrix
6. **Model Persistence**: Serialized `.joblib` files for production use

## Intervention System

The intervention engine maps predicted states to appropriate adaptive support:

| Predicted State | Intervention Action | UI Target | UI Effect | Message |
|----------------|-------------------|-----------|-----------|---------|
| PRODUCTIVE | NO_ACTION | none | none | Continue good work |
| DRIVER_DOMINANCE | ROLE_SWITCH_SUPPORT | role_switch_button | glow | Consider switching roles |
| PASSIVE_NAVIGATOR | NAVIGATOR_PARTICIPATION | chat_input | pulse | Navigator, explain your thinking |
| LOGIC_STRUGGLE | LOGIC_SUPPORT | hint_panel | highlight | Break problem into smaller steps |
| DISENGAGED | RE_ENGAGEMENT_SUPPORT | discussion_panel | glow | Let's summarize and plan next steps |

## RAG Integration

### Knowledge Base
- **Content**: Java concepts, common mistakes, debugging guidance
- **Structure**: Chunked documents with concept tags
- **Retrieval**: Top-3 most relevant chunks based on current context
- **Output**: Short help cards with concept reminder, example idea, reflective question

### RAG Triggering
- **Automatic**: Activated when intervention engine selects logic/concept support
- **Context-Aware**: Uses current question, concept tags, error context
- **Educational**: Grounded in curriculum-aligned content, not generic AI responses

## Usage

### Real-time Prediction Flow
1. **Events Collection**: Frontend logs collaboration events
2. **Feature Window Creation**: 1-minute windows with 3-minute rolling aggregation
3. **ML Prediction**: XGBoost predicts current collaboration state
4. **Intervention Selection**: Rule-based mapping to appropriate support
5. **RAG Activation**: Knowledge-based hints for logic/concept struggles
6. **UI Delivery**: Adaptive cues (glow, pulse, highlight, hint cards)

### API Endpoints

```python
# Predict pair state
POST /predict-pair-state
{
  "sessionId": "S001",
  "features": {...}
}

# Recommend intervention
POST /recommend-intervention  
{
  "sessionId": "S001", 
  "predictedState": "DRIVER_DOMINANCE",
  "confidence": 0.87
}

# Retrieve contextual hint
POST /retrieve-hint
{
  "sessionId": "S001",
  "conceptTags": ["arrays", "indexing"],
  "errorContext": "ArrayIndexOutOfBounds"
}
```

## Dataset Construction

### Training Data Sources
1. **Pilot Sessions**: 8-15 real pair programming sessions (20-40 minutes each)
2. **Manual Labels**: Expert-coded one-minute windows with observed collaboration states
3. **Mock Sessions**: Simulated data for underrepresented states (DISENGAGED, PASSIVE_NAVIGATOR)

### Feature Dataset Structure
```csv
session_id,window_start,user1_edit_count_1m,user2_edit_count_1m,edit_balance_ratio_1m,time_since_role_switch,run_attempts_1m,run_success_rate_1m,consecutive_failure_count_1m,idle_ratio_1m,discussion_note_count_1m,prompt_count_1m,active_user_dominance_1m,backtracking_ratio_1m,progress_trend_1m,user1_edit_count_3m,user2_edit_count_3m,avg_edit_balance_3m,total_run_attempts_3m,avg_run_success_rate_3m,total_consecutive_failure_count_3m,avg_idle_ratio_3m,total_discussion_note_count_3m,total_prompt_count_3m,avg_active_user_dominance_3m,avg_backtracking_ratio_3m,avg_progress_trend_3m,label
```

## Model Performance

### Expected Metrics (Prototype)
- **Target Accuracy**: 80-85% (feasible for behavioral prediction)
- **Key Features**: Edit balance ratio, idle ratio, run success rate, discussion count
- **Validation**: Session-level splitting to prevent data leakage

## Implementation Notes

### Design Principles
- **Collaboration-Focused**: Features capture how students work together, not just code quality
- **Real-Time**: 1-minute windows with rolling aggregation for responsiveness
- **Non-Intrusive**: Interventions provide support without disrupting flow
- **Educational**: RAG hints scaffold learning rather than giving answers
- **Scalable**: Modular design with clear separation of concerns

### Deployment Requirements
- **Python Environment**: Python 3.8+, required packages in `requirements.txt`
- **Model Files**: Serialized `.joblib` files in `models/` directory
- **FastAPI**: Production-ready REST API endpoints
- **Monitoring**: Built-in evaluation and performance tracking

This component provides the foundation for adaptive, collaboration-aware support in the pair programming system, enabling real-time intervention based on observed behavioral patterns rather than just syntax correction.
