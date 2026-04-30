"use client";

import { useState } from "react";
import axios from "axios";
import { BrainCircuit, Activity, AlertCircle } from "lucide-react";

export default function SandboxPage() {
  const [features, setFeatures] = useState({
    edit_balance_ratio_3m: 0.5,
    avg_run_success_rate_3m: 0.5,
    total_discussion_note_count_3m: 2,
    navigator_chat_count_3m: 1,
    avg_idle_ratio_3m: 0.2,
    role_switch_frequency_3m: 0.3,
    error_recovery_time_avg_3m: 30,
    collaboration_score_3m: 0.6,
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [intervention, setIntervention] = useState<any>(null);

  const handlePredict = async () => {
    setLoading(true);
    try {
      // 1. Predict state
      const stateRes = await axios.post("http://localhost:8000/predict-pair-state", {
        sessionId: "sandbox-session",
        features: features
      });

      setPrediction(stateRes.data);

      // 2. Recommend intervention
      const interventionRes = await axios.post("http://localhost:8000/recommend-intervention", {
        sessionId: "sandbox-session",
        predictedState: stateRes.data.predictedState,
        confidence: stateRes.data.confidence
      });

      setIntervention(interventionRes.data);

    } catch (err) {
      console.error(err);
      alert("Failed to connect to ML Service on port 8000. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = (key: string, val: string | number) => {
    setFeatures(prev => ({ ...prev, [key]: Number(val) }));
  };

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-blue-500" />
          ML Model Sandbox
        </h1>
        <p className="text-gray-400 mt-2">
          Manually adjust the 3-minute rolling features below to see how the XGBoost model predicts the collaboration state.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Adjust Features (Last 3 Minutes)
          </h2>

          <div className="space-y-4">
            <FeatureSlider 
              label="Edit Balance Ratio (0 = One-sided, 1 = Equal)"
              value={features.edit_balance_ratio_3m}
              onChange={(v) => updateFeature("edit_balance_ratio_3m", v)}
              min={0} max={1} step={0.1}
            />
            <FeatureSlider 
              label="Avg Run Success Rate"
              value={features.avg_run_success_rate_3m}
              onChange={(v) => updateFeature("avg_run_success_rate_3m", v)}
              min={0} max={1} step={0.1}
            />
            <FeatureSlider 
              label="Total Discussion Notes"
              value={features.total_discussion_note_count_3m}
              onChange={(v) => updateFeature("total_discussion_note_count_3m", v)}
              min={0} max={20} step={1}
            />
            <FeatureSlider 
              label="Navigator Chat Count"
              value={features.navigator_chat_count_3m}
              onChange={(v) => updateFeature("navigator_chat_count_3m", v)}
              min={0} max={20} step={1}
            />
            <FeatureSlider 
              label="Avg Idle Ratio (0 = Active, 1 = Inactive)"
              value={features.avg_idle_ratio_3m}
              onChange={(v) => updateFeature("avg_idle_ratio_3m", v)}
              min={0} max={1} step={0.1}
            />
            <FeatureSlider 
              label="Role Switch Frequency (Switches per min)"
              value={features.role_switch_frequency_3m}
              onChange={(v) => updateFeature("role_switch_frequency_3m", v)}
              min={0} max={3} step={0.1}
            />
            <FeatureSlider 
              label="Error Recovery Time Avg (seconds)"
              value={features.error_recovery_time_avg_3m}
              onChange={(v) => updateFeature("error_recovery_time_avg_3m", v)}
              min={0} max={300} step={10}
            />
            <FeatureSlider 
              label="Collaboration Score (Rule-based Baseline)"
              value={features.collaboration_score_3m}
              onChange={(v) => updateFeature("collaboration_score_3m", v)}
              min={0} max={1} step={0.1}
            />
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 transition text-white font-bold py-3 px-4 rounded-lg mt-6"
          >
            {loading ? "Predicting..." : "Predict Pair State"}
          </button>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
              Live Prediction Result
            </h2>
            
            {!prediction ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 italic">
                Adjust features and click Predict to see the output.
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Predicted State</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    {prediction.predictedState.replace('_', ' ')}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Confidence:</span>
                    <span className="text-emerald-400 font-mono">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {intervention && (
                  <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-500/30">
                    <p className="text-sm text-indigo-400 mb-2 font-semibold">Recommended Intervention</p>
                    <div className="space-y-2">
                      <p><span className="text-zinc-400">Action:</span> <span className="text-white">{intervention.action}</span></p>
                      <p><span className="text-zinc-400">Target UI:</span> <span className="text-white">{intervention.delivery.uiTarget}</span></p>
                      <p><span className="text-zinc-400">Effect:</span> <span className="text-white">{intervention.delivery.uiEffect}</span></p>
                      <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800 text-sm font-mono text-zinc-300">
                        "{intervention.delivery.message}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureSlider({ label, value, onChange, min, max, step }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <label className="text-zinc-300">{label}</label>
        <span className="text-blue-400 font-mono">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-blue-500"
      />
    </div>
  );
}
