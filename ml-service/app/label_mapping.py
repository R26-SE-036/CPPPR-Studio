# Pair State Label Mapping
# Defines the five collaboration states for pair programming

PAIR_STATES = [
    "PRODUCTIVE",
    "DRIVER_DOMINANCE", 
    "PASSIVE_NAVIGATOR",
    "LOGIC_STRUGGLE",
    "DISENGAGED"
]

# State descriptions for logging and documentation
STATE_DESCRIPTIONS = {
    "PRODUCTIVE": "Both students are actively collaborating well with balanced participation",
    "DRIVER_DOMINANCE": "One student is doing most of the coding for an extended time",
    "PASSIVE_NAVIGATOR": "Navigator is not actively contributing or discussing",
    "LOGIC_STRUGGLE": "Pair is active but stuck due to repeated failures or logic confusion",
    "DISENGAGED": "Both students show low activity or no meaningful progress"
}

# Intervention mapping for each state
STATE_INTERVENTIONS = {
    "PRODUCTIVE": {
        "action": "NO_ACTION",
        "ui_target": "none",
        "ui_effect": "none",
        "message": "Great collaboration! Keep up the good work."
    },
    "DRIVER_DOMINANCE": {
        "action": "ROLE_SWITCH_SUPPORT",
        "ui_target": "role_switch_button",
        "ui_effect": "glow",
        "message": "Consider switching Driver and Navigator to balance participation."
    },
    "PASSIVE_NAVIGATOR": {
        "action": "NAVIGATOR_PARTICIPATION_SUPPORT",
        "ui_target": "chat_input",
        "ui_effect": "pulse",
        "message": "Navigator, try explaining your thinking or suggesting the next step."
    },
    "LOGIC_STRUGGLE": {
        "action": "LOGIC_SUPPORT",
        "ui_target": "hint_panel",
        "ui_effect": "highlight",
        "message": "Break the problem into smaller steps and test each part."
    },
    "DISENGAGED": {
        "action": "RE_ENGAGEMENT_SUPPORT",
        "ui_target": "discussion_panel",
        "ui_effect": "glow",
        "message": "Let's summarize what we've accomplished and plan our next steps."
    }
}

def get_state_description(state: str) -> str:
    """Get human-readable description of a state."""
    return STATE_DESCRIPTIONS.get(state, "Unknown state")

def get_intervention_for_state(state: str) -> dict:
    """Get the recommended intervention for a given state."""
    return STATE_INTERVENTIONS.get(state, STATE_INTERVENTIONS["PRODUCTIVE"])

def validate_state(state: str) -> bool:
    """Validate if a state is recognized."""
    return state in PAIR_STATES
