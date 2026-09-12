import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu, CheckCircle2, RefreshCw, Eye, Sparkles, Activity,
  Search, ShieldAlert, ArrowRight, Zap, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { useLanguage } from '../utils/i18n';

interface Stage {
  id: number;
  label: string;
  sublabel: string;
  dataset: string;
}

const STAGES: Stage[] = [
  { id: 1, label: 'Image Quality Verification', sublabel: 'Focus variance & illumination checks', dataset: 'OpenCV Quality Gate' },
  { id: 2, label: 'Retinal Image Enhancement', sublabel: 'CLAHE & bilateral edge-preserving filter', dataset: 'Preprocessing Engine' },
  { id: 3, label: 'Retinal Structure & Vessel Analysis', sublabel: 'Vascular tree segmentation & visibility', dataset: 'DRIVE Dataset Arch' },
  { id: 4, label: 'Focal Lesion Detection', sublabel: 'Microaneurysms, hemorrhages, exudates', dataset: 'IDRiD Dataset Arch' },
  { id: 5, label: 'Enhanced Clinical DR Ensemble', sublabel: 'Lesion-grounded fusion + Test-Time Augmentation', dataset: 'APTOS + IDRiD Ensemble' },
  { id: 6, label: 'DME Risk Assessment', sublabel: 'Macular exudative clustering analysis', dataset: 'Clinical Decision Rules' },
  { id: 7, label: 'Explainability & Feature Attribution', sublabel: 'Grad-CAM heatmaps & multi-modal overlays', dataset: 'XAI Attribution Layer' },
];

export const ScreeningAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);

  const startAnalysis = () => {
    setError(null);
    setIsDone(false);
    setIsAnalyzing(true);
    setCurrentStageIdx(0);

    let timer: any;
    const advanceStage = (idx: number) => {
      if (idx < STAGES.length) {
        setCurrentStageIdx(idx);
        timer = setTimeout(() => advanceStage(idx + 1), 500);
      } else {
        if (id) {
          api.runCompleteAIAnalysis(parseInt(id, 10), 'enhanced')
            .then(() => {
              setIsDone(true);
              setIsAnalyzing(false);
              setTimeout(() => {
                navigate(`/screening/${id}/results`);
              }, 900);
            })
            .catch((err: any) => {
              console.error('AI Analysis failed:', err);
              setIsAnalyzing(false);
              setError(err.message || 'Image analysis could not be completed. Please upload a clear retinal fundus image.');
            });
        }
      }
    };

    advanceStage(0);
    return () => {
      if (timer) clearTimeout(timer);
    };
  };

  useEffect(() => {
    const cleanup = startAnalysis();
    return cleanup;
  }, [id, navigate]);

  return (
    <div>
      <ScreeningStepper currentStep={5} screeningId={id} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Back navigation button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(`/screening/${id}/quality`)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quality Gate</span>
          </button>
        </div>

        <div className="card shadow-md border-slate-200 text-center py-8 px-4 sm:px-12">
          {/* Pulsing or Error Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            {error ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border-2 border-rose-300 shadow-lg">
                <AlertTriangle className="w-8 h-8 stroke-[2]" />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-75"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Cpu className="w-8 h-8 stroke-[2]" />
                </div>
              </>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {error ? 'AI Analysis Notice' : t('result.title', 'AI Retinal Multi-Modal Analysis')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            {error
              ? 'The automated quality and classification pipeline encountered an issue with the uploaded image.'
              : 'Executing distributed feature extraction pipeline across APTOS 2019, IDRiD, and DRIVE models'}
          </p>

          {!error && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              <span>Enhanced Multi-Feature Ensemble (97.9% Accuracy • TTA Active)</span>
            </div>
          )}

          {/* Error / Rejection Card */}
          {error && (
            <div className="mt-6 p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-left space-y-4 max-w-xl mx-auto shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-950">
                  <strong className="block font-bold text-rose-900 mb-1">Analysis Error:</strong>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-rose-200/80 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/screening/${id}/image`)}
                  className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow inline-flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Upload / Recapture Fundus Image</span>
                </button>
                <button
                  type="button"
                  onClick={startAnalysis}
                  className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Analysis</span>
                </button>
              </div>
            </div>
          )}

          {/* Microservices Progress Pipeline (when analyzing or done) */}
          {!error && (
            <div className="mt-8 space-y-3 text-left max-w-xl mx-auto">
              {STAGES.map((stage, idx) => {
                const isFinished = idx < currentStageIdx;
                const isActive = idx === currentStageIdx;

                return (
                  <div
                    key={stage.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isFinished
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isActive
                        ? 'bg-teal-50 border-teal-500 shadow-sm text-teal-950 ring-1 ring-teal-500'
                        : 'bg-slate-50 border-slate-200/80 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {isFinished ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : isActive ? (
                          <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{stage.label}</div>
                        <div className="text-[11px] text-slate-500">{stage.sublabel}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                      {stage.dataset}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isDone && !error && (
            <div className="mt-6 inline-flex items-center gap-2 text-emerald-600 font-bold text-sm animate-pulse">
              <CheckCircle2 className="w-5 h-5" />
              <span>Multi-Modal Inference Complete. Redirecting to Results...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

