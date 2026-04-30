from pydantic import BaseModel
from typing import List, Optional

class RetrieveHintRequest(BaseModel):
    sessionId: str
    questionId: str
    conceptTags: List[str]
    errorContext: Optional[str] = None

class RetrieveHintResponse(BaseModel):
    conceptReminder: str
    exampleIdea: str
    reflectiveQuestion: str
