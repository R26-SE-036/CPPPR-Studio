from pydantic import BaseModel
from typing import Dict, Any

class PredictPairStateRequest(BaseModel):
    sessionId: str
    features: Dict[str, Any]

class PredictPairStateResponse(BaseModel):
    sessionId: str
    predictedState: str
    confidence: float
    modelVersion: str
