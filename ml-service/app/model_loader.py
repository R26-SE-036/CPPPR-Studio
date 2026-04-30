import joblib
import os
from typing import Dict, Any, List
from .label_mapping import PAIR_STATES, get_state_description

class ModelLoader:
    """Loads and manages trained ML models for pair state prediction."""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.model = None
        self.label_encoder = None
        self.feature_columns = None
        self.model_version = None
        
    def load_models(self) -> bool:
        """Load all required model files."""
        try:
            # Load XGBoost model
            model_path = os.path.join(self.models_dir, "pair_state_xgboost.joblib")
            if not os.path.exists(model_path):
                print(f"❌ Model file not found: {model_path}")
                return False
                
            self.model = joblib.load(model_path)
            print(f"✅ Loaded XGBoost model from {model_path}")
            
            # Load label encoder
            encoder_path = os.path.join(self.models_dir, "pair_state_label_encoder.joblib")
            if not os.path.exists(encoder_path):
                print(f"❌ Label encoder file not found: {encoder_path}")
                return False
                
            self.label_encoder = joblib.load(encoder_path)
            print(f"✅ Loaded label encoder from {encoder_path}")
            
            # Load feature columns
            columns_path = os.path.join(self.models_dir, "pair_state_feature_columns.joblib")
            if not os.path.exists(columns_path):
                print(f"❌ Feature columns file not found: {columns_path}")
                return False
                
            self.feature_columns = joblib.load(columns_path)
            print(f"✅ Loaded feature columns from {columns_path}")
            
            # Set model version
            self.model_version = "pair_state_xgboost_v1"
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading models: {str(e)}")
            return False
    
    def predict_state(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict pair state from features."""
        if not self.model or not self.label_encoder:
            return {
                "error": "Models not loaded",
                "predictedState": None,
                "confidence": 0.0
            }
        
        try:
            # Prepare features in correct order
            feature_vector = []
            for col in self.feature_columns:
                if col in features:
                    feature_vector.append(features[col])
                else:
                    feature_vector.append(0.0)  # Default value for missing features
            
            # Make prediction
            prediction = self.model.predict([feature_vector])[0]
            confidence = max(self.model.predict_proba([feature_vector])[0])  # Get max probability
            
            # Convert prediction back to label
            predicted_state = self.label_encoder.inverse_transform([prediction])[0]
            
            return {
                "sessionId": features.get("sessionId", ""),
                "predictedState": predicted_state,
                "confidence": float(confidence),
                "modelVersion": self.model_version,
                "features": {
                    col: features.get(col, 0.0) for col in self.feature_columns
                }
            }
            
        except Exception as e:
            return {
                "error": f"Prediction failed: {str(e)}",
                "predictedState": None,
                "confidence": 0.0
            }
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from trained model."""
        if not self.model:
            return {}
        
        try:
            importance = self.model.feature_importances_
            return {
                col: float(imp) for col, imp in zip(self.feature_columns, importance)
            }
        except Exception as e:
            print(f"Error getting feature importance: {str(e)}")
            return {}
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "modelVersion": self.model_version,
            "modelType": "XGBoost",
            "featureCount": len(self.feature_columns) if self.feature_columns else 0,
            "supportedStates": PAIR_STATES,
            "stateDescriptions": {
                state: get_state_description(state) for state in PAIR_STATES
            }
        }

# Global model loader instance
model_loader = ModelLoader()
