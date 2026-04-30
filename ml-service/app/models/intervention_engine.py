from typing import Dict, Any

class InterventionEngine:
    def __init__(self):
        self.intervention_mapping = {
            "PRODUCTIVE": {
                "action": "NO_ACTION",
                "delivery": {
                    "type": "none",
                    "uiTarget": "none",
                    "uiEffect": "none",
                    "message": "none",
                }
            },
            "DRIVER_DOMINANCE": {
                "action": "ROLE_SWITCH_SUPPORT",
                "delivery": {
                    "type": "combined",
                    "uiTarget": "role_switch_button",
                    "uiEffect": "glow",
                    "message": "You have been in the same roles for a while. Consider switching Driver and Navigator.",
                }
            },
            "PASSIVE_NAVIGATOR": {
                "action": "NAVIGATOR_PARTICIPATION_SUPPORT",
                "delivery": {
                    "type": "prompt",
                    "uiTarget": "chat_input",
                    "uiEffect": "pulse",
                    "message": "Navigator, explain the next step",
                }
            },
            "LOGIC_STRUGGLE": {
                "action": "LOGIC_SUPPORT",
                "delivery": {
                    "type": "hint",
                    "uiTarget": "hint_panel",
                    "uiEffect": "highlight",
                    "message": "Break the logic into smaller steps.",
                }
            },
            "DISENGAGED": {
                "action": "RE_ENGAGEMENT_SUPPORT",
                "delivery": {
                    "type": "prompt",
                    "uiTarget": "discussion_panel",
                    "uiEffect": "glow",
                    "message": "Summarize the next step together",
                }
            }
        }

    async def recommend(self, predicted_state: str, confidence: float) -> Dict[str, Any]:
        """Recommend an intervention based on the predicted state and confidence."""
        # Only show interventions if confidence is above threshold
        if confidence < 0.6:
            return {
                "action": "NO_ACTION",
                "delivery": {
                    "type": "none",
                    "uiTarget": "none",
                    "uiEffect": "none",
                    "message": "Low confidence prediction",
                }
            }
        
        # Get the intervention for the predicted state
        intervention = self.intervention_mapping.get(predicted_state, self.intervention_mapping["PRODUCTIVE"])
        
        # Add cooldown logic (in a real implementation, this would check recent interventions)
        # For now, we'll just return the intervention
        return intervention
