from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.predictions import PredictPairStateRequest, PredictPairStateResponse
from app.schemas.interventions import RecommendInterventionRequest, RecommendInterventionResponse
from app.schemas.hints import RetrieveHintRequest, RetrieveHintResponse
from app.models.predictor import PairStatePredictor
from app.models.intervention_engine import InterventionEngine
from app.models.rag_retriever import RAGRetriever

app = FastAPI(
    title="Pair Programming ML Service",
    description="ML service for pair programming collaboration analysis and adaptive support",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
predictor = PairStatePredictor()
intervention_engine = InterventionEngine()
rag_retriever = RAGRetriever()

@app.post("/predict-pair-state", response_model=PredictPairStateResponse)
async def predict_pair_state(request: PredictPairStateRequest):
    """Predict the current collaboration state of a pair programming session."""
    try:
        prediction = await predictor.predict(request.features)
        return PredictPairStateResponse(
            sessionId=request.sessionId,
            predictedState=prediction["state"],
            confidence=prediction["confidence"],
            modelVersion="pair_state_xgboost_v1",
        )
    except Exception as e:
        # Fallback prediction
        return PredictPairStateResponse(
            sessionId=request.sessionId,
            predictedState="PRODUCTIVE",
            confidence=0.5,
            modelVersion="fallback_v1",
        )

@app.post("/recommend-intervention", response_model=RecommendInterventionResponse)
async def recommend_intervention(request: RecommendInterventionRequest):
    """Recommend an intervention based on the predicted pair state."""
    try:
        intervention = await intervention_engine.recommend(
            request.predictedState, 
            request.confidence
        )
        return RecommendInterventionResponse(
            state=request.predictedState,
            action=intervention["action"],
            delivery=intervention["delivery"],
        )
    except Exception as e:
        # Fallback intervention
        return RecommendInterventionResponse(
            state=request.predictedState,
            action="NO_ACTION",
            delivery={
                "type": "none",
                "uiTarget": "none",
                "uiEffect": "none",
                "message": "Intervention service unavailable",
            },
        )

@app.post("/retrieve-hint", response_model=RetrieveHintResponse)
async def retrieve_hint(request: RetrieveHintRequest):
    """Retrieve a contextual hint based on the current programming context."""
    try:
        hint = await rag_retriever.retrieve_hint(
            request.conceptTags,
            request.errorContext,
        )
        return RetrieveHintResponse(
            conceptReminder=hint["conceptReminder"],
            exampleIdea=hint["exampleIdea"],
            reflectiveQuestion=hint["reflectiveQuestion"],
        )
    except Exception as e:
        # Fallback hint
        return RetrieveHintResponse(
            conceptReminder="Review the problem requirements carefully.",
            exampleIdea="Break down the problem into smaller steps.",
            reflectiveQuestion="What is the first step you need to take?",
        )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "pair-programming-ml"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
