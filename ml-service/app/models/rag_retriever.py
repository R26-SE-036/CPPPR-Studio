from typing import List, Dict, Any
import warnings

# Import the new RAGService
from app.rag import RAGService
from app.rag.schemas import RAGHintRequest

class RAGRetriever:
    """
    Deprecated: This is a compatibility wrapper for the old RAGRetriever.
    New code should use app.rag.RAGService directly.
    """
    def __init__(self):
        warnings.warn(
            "app.models.rag_retriever.RAGRetriever is deprecated. Use app.rag.RAGService instead.",
            DeprecationWarning,
            stacklevel=2
        )
        self.rag_service = RAGService()

    async def retrieve_hint(self, concept_tags: List[str], error_context: str = None) -> Dict[str, str]:
        """Retrieve a contextual hint based on concept tags and error context."""
        # Convert the old parameters to the new schema
        request = RAGHintRequest(
            sessionId="COMPAT_WRAPPER",
            pairId="COMPAT_WRAPPER",
            predictedState="LOGIC_STRUGGLE",
            interventionType="LOGIC_HINT",
            questionConceptTags=concept_tags if concept_tags else [],
            recentErrorContext=error_context if error_context else "",
            recentCodeSnippet=""
        )
        
        # The new service is synchronous
        response = self.rag_service.process_request(request)
        
        # Return the format expected by old code
        return {
            "conceptReminder": response.conceptReminder,
            "exampleIdea": response.exampleIdea,
            "reflectiveQuestion": response.reflectiveQuestion
        }
