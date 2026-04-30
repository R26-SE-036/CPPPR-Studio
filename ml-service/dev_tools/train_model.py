import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import json
from typing import Dict, Any
from feature_extractor import FeatureExtractor

class ModelTrainer:
    """Train XGBoost model for pair programming collaboration prediction."""
    
    def __init__(self):
        self.feature_extractor = FeatureExtractor()
        self.model = None
        self.label_encoder = LabelEncoder()
        self.feature_columns = None
    
    def load_data(self, features_file: str) -> tuple:
        """Load training data and prepare for model training."""
        df = pd.read_csv(features_file)
        
        # Separate features and labels
        feature_columns = [col for col in df.columns if col not in ['session_id', 'label']]
        X = df[feature_columns].fillna(0)
        y = df['label']
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        return X, y_encoded, feature_columns
    
    def train_model(self, X, y_encoded):
        """Train XGBoost model."""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Train XGBoost model
        self.model = xgb.XGBClassifier(
            objective='multi:softprob',
            num_class=5,  # PRODUCTIVE, DRIVER_DOMINANCE, PASSIVE_NAVIGATOR, LOGIC_STRUGGLE, DISENGAGED
            max_depth=6,
            learning_rate=0.1,
            n_estimators=100,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"Model Accuracy: {accuracy:.4f}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=self.label_encoder.classes_))
        
        return X_train, X_test, y_train, y_test
    
    def save_model(self, model_path: str, encoder_path: str, columns_path: str):
        """Save trained model and related components."""
        if self.model:
            joblib.dump(self.model, model_path)
            joblib.dump(self.label_encoder, encoder_path)
            joblib.dump(self.feature_columns, columns_path)
            print(f"Model saved to {model_path}")
            print(f"Label encoder saved to {encoder_path}")
            print(f"Feature columns saved to {columns_path}")
    
    def train_and_save(self, features_file: str, model_dir: str = '../models'):
        """Complete training pipeline."""
        print("Starting model training...")
        
        # Load and prepare data
        X, y_encoded, feature_columns = self.load_data(features_file)
        self.feature_columns = feature_columns
        
        # Train model
        X_train, X_test, y_train, y_test = self.train_model(X, y_encoded)
        
        # Save model
        import os
        os.makedirs(model_dir, exist_ok=True)
        
        model_path = os.path.join(model_dir, 'pair_state_xgboost.joblib')
        encoder_path = os.path.join(model_dir, 'pair_state_label_encoder.joblib')
        columns_path = os.path.join(model_dir, 'pair_state_feature_columns.joblib')
        
        self.save_model(model_path, encoder_path, columns_path)
        
        print("Training completed successfully!")
        
        return {
            'accuracy': accuracy_score(y_test, self.model.predict(X_test)),
            'feature_importance': dict(zip(feature_columns, self.model.feature_importances_)),
            'classes': list(self.label_encoder.classes_)
        }

def create_sample_training_data():
    """Create sample training data for demonstration."""
    sample_data = [
        {
            'session_id': 'session1',
            'edit_balance_ratio_3m': 0.75,  # Driver dominates
            'avg_run_success_rate_3m': 0.8,
            'total_discussion_note_count_3m': 2,
            'navigator_chat_count_3m': 1,
            'avg_idle_ratio_3m': 0.2,
            'role_switch_frequency_3m': 0,
            'error_recovery_time_avg_3m': 30,
            'collaboration_score_3m': 0.6,
            'label': 'DRIVER_DOMINANCE'
        },
        {
            'session_id': 'session2',
            'edit_balance_ratio_3m': 0.5,  # Balanced
            'avg_run_success_rate_3m': 0.9,
            'total_discussion_note_count_3m': 8,
            'navigator_chat_count_3m': 6,
            'avg_idle_ratio_3m': 0.1,
            'role_switch_frequency_3m': 2,
            'error_recovery_time_avg_3m': 15,
            'collaboration_score_3m': 0.85,
            'label': 'PRODUCTIVE'
        },
        {
            'session_id': 'session3',
            'edit_balance_ratio_3m': 0.9,  # Driver dominates heavily
            'avg_run_success_rate_3m': 0.6,
            'total_discussion_note_count_3m': 1,
            'navigator_chat_count_3m': 0,
            'avg_idle_ratio_3m': 0.4,
            'role_switch_frequency_3m': 0,
            'error_recovery_time_avg_3m': 60,
            'collaboration_score_3m': 0.3,
            'label': 'DRIVER_DOMINANCE'
        },
        {
            'session_id': 'session4',
            'edit_balance_ratio_3m': 0.3,  # Navigator passive
            'avg_run_success_rate_3m': 0.7,
            'total_discussion_note_count_3m': 3,
            'navigator_chat_count_3m': 1,
            'avg_idle_ratio_3m': 0.3,
            'role_switch_frequency_3m': 1,
            'error_recovery_time_avg_3m': 45,
            'collaboration_score_3m': 0.4,
            'label': 'PASSIVE_NAVIGATOR'
        },
        {
            'session_id': 'session5',
            'edit_balance_ratio_3m': 0.6,
            'avg_run_success_rate_3m': 0.3,
            'total_discussion_note_count_3m': 2,
            'navigator_chat_count_3m': 2,
            'avg_idle_ratio_3m': 0.5,
            'role_switch_frequency_3m': 1,
            'error_recovery_time_avg_3m': 90,
            'collaboration_score_3m': 0.2,
            'label': 'LOGIC_STRUGGLE'
        },
        {
            'session_id': 'session6',
            'edit_balance_ratio_3m': 0.4,
            'avg_run_success_rate_3m': 0.2,
            'total_discussion_note_count_3m': 0,
            'navigator_chat_count_3m': 0,
            'avg_idle_ratio_3m': 0.8,
            'role_switch_frequency_3m': 0,
            'error_recovery_time_avg_3m': 120,
            'collaboration_score_3m': 0.1,
            'label': 'DISENGAGED'
        }
    ]
    
    df = pd.DataFrame(sample_data)
    df.to_csv('sample_training_data.csv', index=False)
    print("Sample training data created: sample_training_data.csv")

if __name__ == "__main__":
    # Create sample data first
    create_sample_training_data()
    
    # Train model
    trainer = ModelTrainer()
    
    # Train with sample data
    results = trainer.train_and_save('sample_training_data.csv')
    
    print("\nTraining Results:")
    print(f"Accuracy: {results['accuracy']:.4f}")
    print(f"Classes: {results['classes']}")
    print("Feature Importance:")
    for feature, importance in results['feature_importance'].items():
        print(f"  {feature}: {importance:.4f}")
