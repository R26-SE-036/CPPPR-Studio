import pandas as pd
import numpy as np
from typing import Dict, Any, List
import os
import sys

# Add parent dir so we can import from dev_tools
sys.path.insert(0, os.path.dirname(__file__))
from feature_extractor import FeatureExtractor

class DatasetBuilder:
    """Builds training dataset from raw sessions and saves train/val/test splits."""
    
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(__file__))
        self.sessions_file = os.path.join(self.base_dir, 'data', 'raw_sessions', 'mock_training_sessions.json')
        self.features_file = os.path.join(self.base_dir, 'data', 'extracted', 'pair_state_features_v1.csv')
        self.splits_dir = os.path.join(self.base_dir, 'data', 'splits')
    
    def build_dataset(self) -> bool:
        """Build complete training dataset with proper session-level splitting."""
        try:
            print("🏗  Building training dataset...")
            
            # Step 1: Extract features from sessions
            extractor = FeatureExtractor()
            df = extractor.prepare_training_data(self.sessions_file, self.features_file)
            
            if df is None or len(df) == 0:
                print("❌ No features extracted")
                return False
            
            # Step 2: Split by session (70:15:15)
            train_df, val_df, test_df = self._split_by_session(df)
            
            # Step 3: Save splits
            os.makedirs(self.splits_dir, exist_ok=True)
            
            train_path = os.path.join(self.splits_dir, 'train_v1.csv')
            val_path = os.path.join(self.splits_dir, 'val_v1.csv')
            test_path = os.path.join(self.splits_dir, 'test_v1.csv')
            
            train_df.to_csv(train_path, index=False)
            val_df.to_csv(val_path, index=False)
            test_df.to_csv(test_path, index=False)
            
            print(f"\n✅ Dataset built successfully!")
            print(f"   Train: {len(train_df)} samples → {train_path}")
            print(f"   Val:   {len(val_df)} samples → {val_path}")
            print(f"   Test:  {len(test_df)} samples → {test_path}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error building dataset: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _split_by_session(self, df: pd.DataFrame):
        """Split data by session to prevent data leakage."""
        session_ids = df['session_id'].unique()
        np.random.seed(42)
        np.random.shuffle(session_ids)
        
        n = len(session_ids)
        n_train = int(0.7 * n)
        n_val = int(0.15 * n)
        
        train_sessions = session_ids[:n_train]
        val_sessions = session_ids[n_train:n_train + n_val]
        test_sessions = session_ids[n_train + n_val:]
        
        train_df = df[df['session_id'].isin(train_sessions)]
        val_df = df[df['session_id'].isin(val_sessions)]
        test_df = df[df['session_id'].isin(test_sessions)]
        
        return train_df, val_df, test_df

if __name__ == "__main__":
    builder = DatasetBuilder()
    success = builder.build_dataset()
    
    if success:
        print("\n🎉 Dataset building completed!")
    else:
        print("\n❌ Dataset building failed!")
