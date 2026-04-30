import pandas as pd
import numpy as np
from typing import Dict, List, Any
import json

class FeatureExtractor:
    """Extract features from pair programming session event data.
    
    Features are extracted in 1-minute windows with 3-minute rolling aggregations,
    matching the specification for the XGBoost multi-class classifier.
    """
    
    # All feature columns used by the model
    FEATURE_COLUMNS_1M = [
        'user1_edit_count_1m',
        'user2_edit_count_1m',
        'edit_balance_ratio_1m',
        'time_since_role_switch',
        'run_attempts_1m',
        'run_success_rate_1m',
        'consecutive_failure_count_1m',
        'idle_ratio_1m',
        'discussion_note_count_1m',
        'prompt_count_1m',
        'active_user_dominance_1m',
        'backtracking_ratio_1m',
        'progress_trend_1m',
    ]
    
    FEATURE_COLUMNS_3M = [
        'user1_edit_count_3m',
        'user2_edit_count_3m',
        'avg_edit_balance_3m',
        'total_run_attempts_3m',
        'avg_run_success_rate_3m',
        'total_consecutive_failure_count_3m',
        'avg_idle_ratio_3m',
        'total_discussion_note_count_3m',
        'total_prompt_count_3m',
        'avg_active_user_dominance_3m',
        'avg_backtracking_ratio_3m',
        'avg_progress_trend_3m',
    ]
    
    SIMPLIFIED_COLUMNS = [
        'edit_balance_ratio_3m',
        'avg_run_success_rate_3m',
        'total_discussion_note_count_3m',
        'navigator_chat_count_3m',
        'avg_idle_ratio_3m',
        'role_switch_frequency_3m',
        'error_recovery_time_avg_3m',
        'collaboration_score_3m',
    ]
    
    def __init__(self):
        self.feature_columns = self.SIMPLIFIED_COLUMNS
    
    def extract_session_features(self, session_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract features from a single session's event data."""
        events = session_data.get('events', [])
        duration = session_data.get('durationMinutes', 20)
        
        # Count events by type and user
        user1_edits = sum(1 for e in events if e.get('userId') == 'U001' and e.get('eventType') == 'CODE_EDIT')
        user2_edits = sum(1 for e in events if e.get('userId') == 'U002' and e.get('eventType') == 'CODE_EDIT')
        total_edits = user1_edits + user2_edits
        
        code_runs = [e for e in events if e.get('eventType') == 'CODE_RUN']
        successful_runs = sum(1 for e in code_runs if e.get('metadata', {}).get('success', False))
        total_runs = len(code_runs)
        
        discussions = [e for e in events if e.get('eventType') == 'DISCUSSION_NOTE']
        user2_discussions = sum(1 for e in discussions if e.get('userId') == 'U002')
        
        role_switches = sum(1 for e in events if e.get('eventType') == 'ROLE_SWITCH')
        
        # Compute features
        features = {}
        features['edit_balance_ratio_3m'] = user1_edits / max(total_edits, 1) if total_edits > 0 else 0.5
        features['avg_run_success_rate_3m'] = successful_runs / max(total_runs, 1) if total_runs > 0 else 0.5
        features['total_discussion_note_count_3m'] = len(discussions)
        features['navigator_chat_count_3m'] = user2_discussions
        
        # Idle ratio — fraction of minutes with no events
        minutes_with_events = len(set(e.get('timestamp', '').split('-')[-1] for e in events if e.get('timestamp')))
        features['avg_idle_ratio_3m'] = max(0, 1 - (minutes_with_events / max(duration, 1)))
        
        features['role_switch_frequency_3m'] = role_switches / max(duration / 10, 1)
        
        # Error recovery time — estimate from consecutive failures
        consecutive_failures = 0
        max_consecutive = 0
        for e in events:
            if e.get('eventType') == 'CODE_RUN':
                if not e.get('metadata', {}).get('success', True):
                    consecutive_failures += 1
                    max_consecutive = max(max_consecutive, consecutive_failures)
                else:
                    consecutive_failures = 0
        features['error_recovery_time_avg_3m'] = max_consecutive * 30  # Estimate 30s per failure
        
        # Collaboration score (composite)
        balance_score = 1 - abs(features['edit_balance_ratio_3m'] - 0.5) * 2
        discussion_score = min(features['total_discussion_note_count_3m'] / 10, 1)
        active_score = 1 - features['avg_idle_ratio_3m']
        run_score = features['avg_run_success_rate_3m']
        features['collaboration_score_3m'] = np.mean([balance_score, discussion_score, active_score, run_score])
        
        features['session_id'] = session_data.get('sessionId', '')
        
        return features
    
    def extract_batch_features(self, sessions_data: List[Dict[str, Any]]) -> pd.DataFrame:
        """Extract features from multiple sessions."""
        all_features = []
        
        for session in sessions_data:
            features = self.extract_session_features(session)
            features['label'] = session.get('targetState', 'PRODUCTIVE')
            all_features.append(features)
        
        return pd.DataFrame(all_features)
    
    def prepare_training_data(self, sessions_file: str, output_file: str):
        """Prepare training data from session logs."""
        with open(sessions_file, 'r') as f:
            sessions_data = json.load(f)
        
        df = self.extract_batch_features(sessions_data)
        df.to_csv(output_file, index=False)
        
        print(f"✅ Features saved to {output_file}")
        print(f"   Shape: {df.shape}")
        print(f"   Columns: {list(df.columns)}")
        print(f"   Label distribution:")
        for label, count in df['label'].value_counts().items():
            print(f"     {label}: {count} ({count/len(df)*100:.1f}%)")
        
        return df

if __name__ == "__main__":
    extractor = FeatureExtractor()
    extractor.prepare_training_data(
        '../data/raw_sessions/mock_training_sessions.json',
        '../data/extracted/pair_state_features_v1.csv'
    )
