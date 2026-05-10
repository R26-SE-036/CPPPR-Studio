import os
import sys
import asyncio

# Add ml-service root to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.models.predictor import PairStatePredictor

async def test_model():
    print("[INFO] Initializing Predictor...")
    predictor = PairStatePredictor()
    
    # Define test cases for all possible states
    test_cases = {
        "Expected: DISENGAGED (High idle, no chat)": {
            "edit_balance_ratio_3m": 0.5,
            "avg_run_success_rate_3m": 0.5,
            "total_discussion_note_count_3m": 0,
            "navigator_chat_count_3m": 0,
            "avg_idle_ratio_3m": 0.9,
            "role_switch_frequency_3m": 0,
            "error_recovery_time_avg_3m": 0,
            "collaboration_score_3m": 0.1
        },
        "Expected: DRIVER_DOMINANCE (One person coding, no navigator chat)": {
            "edit_balance_ratio_3m": 0.95,
            "avg_run_success_rate_3m": 0.8,
            "total_discussion_note_count_3m": 2,
            "navigator_chat_count_3m": 0,
            "avg_idle_ratio_3m": 0.1,
            "role_switch_frequency_3m": 0,
            "error_recovery_time_avg_3m": 10,
            "collaboration_score_3m": 0.3
        },
        "Expected: LOGIC_STRUGGLE (Low run success, some chat)": {
            "edit_balance_ratio_3m": 0.5,
            "avg_run_success_rate_3m": 0.1,
            "total_discussion_note_count_3m": 5,
            "navigator_chat_count_3m": 2,
            "avg_idle_ratio_3m": 0.2,
            "role_switch_frequency_3m": 0,
            "error_recovery_time_avg_3m": 120,
            "collaboration_score_3m": 0.6
        },
        "Expected: LOW_QUALITY_REVIEW (Fast code runs, no chat, low switch)": {
            "edit_balance_ratio_3m": 0.8,
            "avg_run_success_rate_3m": 0.9,
            "total_discussion_note_count_3m": 0,
            "navigator_chat_count_3m": 0,
            "avg_idle_ratio_3m": 0.2,
            "role_switch_frequency_3m": 0,
            "error_recovery_time_avg_3m": 5,
            "collaboration_score_3m": 0.2
        },
        "Expected: PASSIVE_NAVIGATOR (Coding, some chat, but navigator silent)": {
            "edit_balance_ratio_3m": 0.7,
            "avg_run_success_rate_3m": 0.6,
            "total_discussion_note_count_3m": 1,
            "navigator_chat_count_3m": 0,
            "avg_idle_ratio_3m": 0.1,
            "role_switch_frequency_3m": 1,
            "error_recovery_time_avg_3m": 20,
            "collaboration_score_3m": 0.4
        },
        "Expected: PRODUCTIVE (Balanced coding, good chat, good success)": {
            "edit_balance_ratio_3m": 0.5,
            "avg_run_success_rate_3m": 0.8,
            "total_discussion_note_count_3m": 6,
            "navigator_chat_count_3m": 3,
            "avg_idle_ratio_3m": 0.1,
            "role_switch_frequency_3m": 2,
            "error_recovery_time_avg_3m": 15,
            "collaboration_score_3m": 0.9
        }
    }
    
    print("-" * 50)
    for scenario_name, features in test_cases.items():
        print(f"\n[TEST] {scenario_name}")
        prediction = await predictor.predict(features)
        print(f"  --> Predicted State: {prediction['state']}")
        print(f"  --> Confidence: {prediction['confidence']:.2f}")
    print("\n" + "-" * 50)

if __name__ == "__main__":
    asyncio.run(test_model())
