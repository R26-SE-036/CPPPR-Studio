import pandas as pd
import numpy as np
import joblib
from typing import Dict, Any
import os
import json

class ModelEvaluator:
    """Evaluates trained XGBoost model performance."""
    
    def __init__(self, models_dir: str = "../models"):
        self.models_dir = models_dir
    
    def load_model_and_data(self):
        """Load trained model and test data."""
        try:
            model_path = os.path.join(self.models_dir, "pair_state_xgboost.joblib")
            label_encoder_path = os.path.join(self.models_dir, "pair_state_label_encoder.joblib")
            feature_columns_path = os.path.join(self.models_dir, "pair_state_feature_columns.joblib")
            
            model = joblib.load(model_path)
            label_encoder = joblib.load(label_encoder_path)
            feature_columns = joblib.load(feature_columns_path)
            
            # Load test data
            test_data_path = os.path.join("../data/extracted/pair_state_features_v1.csv")
            if not os.path.exists(test_data_path):
                print(f"❌ Test data not found: {test_data_path}")
                return None, None, None, None
            
            test_df = pd.read_csv(test_data_path)
            
            return model, label_encoder, feature_columns, test_df
            
        except Exception as e:
            print(f"❌ Error loading model/data: {str(e)}")
            return None, None, None, None
    
    def evaluate_model(self, model, label_encoder, feature_columns, test_df) -> Dict[str, Any]:
        """Comprehensive model evaluation."""
        print("📊 Evaluating model performance...")
        
        # Prepare features
        X_test = test_df[feature_columns].fillna(0)
        y_test = test_df['label']
        y_test_encoded = label_encoder.transform(y_test)
        
        # Make predictions
        y_pred_encoded = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Decode back to labels
        y_pred = label_encoder.inverse_transform(y_pred_encoded)
        
        # Calculate metrics
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score, f1_score,
            classification_report, confusion_matrix
        )
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='macro', zero_division=0)
        recall = recall_score(y_test, y_pred, average='macro', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)
        
        # Classification report
        class_names = list(label_encoder.classes_)
        report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True, zero_division=0)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred, labels=class_names)
        
        # Feature importance
        feature_importance = dict(zip(feature_columns, model.feature_importances_))
        
        return {
            'overall_accuracy': float(accuracy),
            'macro_precision': float(precision),
            'macro_recall': float(recall),
            'macro_f1': float(f1),
            'classification_report': report,
            'confusion_matrix': cm.tolist(),
            'feature_importance': feature_importance,
            'class_names': class_names
        }
    
    def print_evaluation_results(self, results: Dict[str, Any]):
        """Print formatted evaluation results."""
        print("\n" + "="*60)
        print("📊 MODEL EVALUATION RESULTS")
        print("="*60)
        
        print(f"Overall Accuracy: {results['overall_accuracy']:.4f}")
        print(f"Macro Precision:  {results['macro_precision']:.4f}")
        print(f"Macro Recall:     {results['macro_recall']:.4f}")
        print(f"Macro F1-Score:   {results['macro_f1']:.4f}")
        
        print(f"\n📈 FEATURE IMPORTANCE (Top 10):")
        importance_items = sorted(
            results['feature_importance'].items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        for i, (feature, importance) in enumerate(importance_items, 1):
            print(f"  {i:2d}. {feature:<35} {importance:.4f}")
        
        print(f"\n📊 CONFUSION MATRIX:")
        cm = results['confusion_matrix']
        class_names = results['class_names']
        
        # Header
        print(f"{'Actual / Predicted':<22}", end="")
        for name in class_names:
            print(f"{name[:12]:>13}", end="")
        print()
        
        # Rows
        for i, row in enumerate(cm):
            print(f"{class_names[i]:<22}", end="")
            for val in row:
                print(f"{val:>13}", end="")
            print()
    
    def save_evaluation_report(self, results: Dict[str, Any], filename: str = None):
        """Save evaluation results to JSON."""
        if filename is None:
            filename = os.path.join(self.models_dir, "pair_state_evaluation_report.json")
        
        evaluation_report = {
            'model_version': 'pair_state_xgboost_v1',
            'evaluation_date': pd.Timestamp.now().isoformat(),
            'metrics': {
                'overall_accuracy': results['overall_accuracy'],
                'macro_precision': results['macro_precision'],
                'macro_recall': results['macro_recall'],
                'macro_f1': results['macro_f1'],
            },
            'feature_importance': results['feature_importance'],
            'class_names': results['class_names'],
        }
        
        with open(filename, 'w') as f:
            json.dump(evaluation_report, f, indent=2)
        
        print(f"\n✅ Evaluation report saved to {filename}")

if __name__ == "__main__":
    evaluator = ModelEvaluator()
    
    result = evaluator.load_model_and_data()
    if result[0] is not None:
        model, label_encoder, feature_columns, test_df = result
        results = evaluator.evaluate_model(model, label_encoder, feature_columns, test_df)
        evaluator.print_evaluation_results(results)
        evaluator.save_evaluation_report(results)
    else:
        print("❌ Could not load model or data. Run train_xgboost.py first.")
