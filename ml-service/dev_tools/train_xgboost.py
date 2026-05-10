import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import json
import os
from feature_extractor import FeatureExtractor

class XGBoostTrainer:
    """Trains XGBoost model for pair state prediction."""
    
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.feature_columns = None
    
    def load_and_prepare_data(self, features_file: str):
        """Load features CSV and prepare for training."""
        df = pd.read_csv(features_file)
        
        # Separate features and labels
        non_feature_cols = ['session_id', 'label']
        feature_columns = [col for col in df.columns if col not in non_feature_cols]
        
        X = df[feature_columns].fillna(0)
        y = df['label']
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        self.feature_columns = feature_columns
        
        print(f"[INFO] Data loaded: {X.shape[0]} samples, {X.shape[1]} features")
        print(f"[INFO] Classes: {list(self.label_encoder.classes_)}")
        print(f"[INFO] Distribution:")
        for cls in self.label_encoder.classes_:
            count = (y == cls).sum()
            print(f"   {cls}: {count} ({count/len(y)*100:.1f}%)")
        
        return X, y_encoded, feature_columns
    
    def train(self, X, y_encoded):
        """Train XGBoost model with train/test split."""
        # Split data (stratified)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Train XGBoost
        self.model = xgb.XGBClassifier(
            objective='multi:softprob',
            num_class=len(self.label_encoder.classes_),
            max_depth=6,
            learning_rate=0.1,
            n_estimators=100,
            random_state=42,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric='mlogloss',
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Decode labels for report
        y_test_labels = self.label_encoder.inverse_transform(y_test)
        y_pred_labels = self.label_encoder.inverse_transform(y_pred)
        
        print(f"\n[INFO] Model Accuracy: {accuracy:.4f}")
        print("\n[INFO] Classification Report:")
        print(classification_report(y_test_labels, y_pred_labels))
        
        return X_test, y_test, y_pred, accuracy
    
    def save_model(self, models_dir: str = None):
        """Save trained model, label encoder, and feature columns."""
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
            
        os.makedirs(models_dir, exist_ok=True)
        
        model_path = os.path.join(models_dir, 'pair_state_xgboost.joblib')
        encoder_path = os.path.join(models_dir, 'pair_state_label_encoder.joblib')
        columns_path = os.path.join(models_dir, 'pair_state_feature_columns.joblib')
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.label_encoder, encoder_path)
        joblib.dump(self.feature_columns, columns_path)
        
        print(f"\n[SUCCESS] Model saved to {model_path}")
        print(f"[SUCCESS] Label encoder saved to {encoder_path}")
        print(f"[SUCCESS] Feature columns saved to {columns_path}")
    
    def train_complete_pipeline(self, sessions_file: str = None, features_file: str = None):
        """Complete pipeline: extract features → train → save."""
        base_dir = os.path.dirname(os.path.dirname(__file__))
        print("[INFO] Starting XGBoost training pipeline...")
        
        # Step 1: Extract features if needed
        if sessions_file and not features_file:
            features_file = os.path.join(base_dir, 'data', 'extracted', 'pair_state_features_v1.csv')
            extractor = FeatureExtractor()
            extractor.prepare_training_data(sessions_file, features_file)
        
        if not features_file:
            features_file = os.path.join(base_dir, 'data', 'extracted', 'pair_state_features_v1.csv')
        
        # Step 2: Load and prepare data
        X, y_encoded, feature_columns = self.load_and_prepare_data(features_file)
        
        # Step 3: Train
        X_test, y_test, y_pred, accuracy = self.train(X, y_encoded)
        
        # Step 4: Save
        self.save_model()
        
        print(f"\n[SUCCESS] Training pipeline completed! Accuracy: {accuracy:.4f}")
        return accuracy

if __name__ == "__main__":
    trainer = XGBoostTrainer()
    
    # Run full pipeline
    base_dir = os.path.dirname(os.path.dirname(__file__))
    accuracy = trainer.train_complete_pipeline(
        sessions_file=os.path.join(base_dir, 'data', 'raw_sessions', 'mock_training_sessions.json')
    )
