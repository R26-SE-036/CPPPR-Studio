from typing import List, Dict, Any
import random

class RAGRetriever:
    def __init__(self):
        # Initialize with some basic Java knowledge chunks
        self.knowledge_base = {
            "arrays": [
                {
                    "concept": "Java arrays are zero-indexed",
                    "example": "The first element is at index 0, last at length-1",
                    "question": "If an array has length 5, what is the highest valid index?"
                },
                {
                    "concept": "Array bounds checking",
                    "example": "Always check i < array.length in loops",
                    "question": "What happens if you access array[array.length]?"
                }
            ],
            "loops": [
                {
                    "concept": "For loop structure",
                    "example": "for (int i = 0; i < n; i++) { /* code */ }",
                    "question": "How many times will this loop run if n=5?"
                },
                {
                    "concept": "While loop condition",
                    "example": "while (condition) { /* code */ }",
                    "question": "When does a while loop stop executing?"
                }
            ],
            "conditions": [
                {
                    "concept": "If-else logic",
                    "example": "if (condition) { /* true */ } else { /* false */ }",
                    "question": "What happens if the condition is false?"
                },
                {
                    "concept": "Comparison operators",
                    "example": "Use == for equality, != for inequality",
                    "question": "What's the difference between = and ==?"
                }
            ],
            "indexing": [
                {
                    "concept": "String indexing",
                    "example": "charAt(0) gets first character",
                    "question": "How do you get the last character of a string?"
                }
            ],
            "debugging": [
                {
                    "concept": "Print debugging",
                    "example": "System.out.println(variable) to check values",
                    "question": "Where should you add print statements?"
                }
            ],
            "common mistakes": [
                {
                    "concept": "Off-by-one errors",
                    "example": "Loop condition should be i < length, not i <= length",
                    "question": "Why is i <= length often wrong?"
                },
                {
                    "concept": "Null pointer exceptions",
                    "example": "Check if object is null before using it",
                    "question": "How can you prevent null pointer exceptions?"
                }
            ]
        }

    async def retrieve_hint(self, concept_tags: List[str], error_context: str = None) -> Dict[str, str]:
        """Retrieve a contextual hint based on concept tags and error context."""
        # Select relevant chunks based on concept tags
        relevant_chunks = []
        
        for tag in concept_tags:
            if tag in self.knowledge_base:
                relevant_chunks.extend(self.knowledge_base[tag])
        
        # If no specific chunks found, use general debugging
        if not relevant_chunks:
            relevant_chunks = self.knowledge_base.get("debugging", [])
        
        # Select a random chunk (in real implementation, would use semantic similarity)
        if relevant_chunks:
            chunk = random.choice(relevant_chunks)
            return {
                "conceptReminder": chunk["concept"],
                "exampleIdea": chunk["example"],
                "reflectiveQuestion": chunk["question"]
            }
        
        # Fallback hint
        return {
            "conceptReminder": "Review the problem requirements carefully.",
            "exampleIdea": "Break down the problem into smaller steps.",
            "reflectiveQuestion": "What is the first step you need to take?"
        }
