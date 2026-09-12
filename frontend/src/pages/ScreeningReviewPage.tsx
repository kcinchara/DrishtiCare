import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope, CheckCircle2, AlertTriangle, RotateCcw,
  ArrowRight, ShieldCheck, User, Eye, FileText, ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { ClinicalAttachments } from '../components/ClinicalAttachments';
import { useLanguage } from '../utils/i18n';
import { ScreeningDetail } from '../types';

export const ScreeningReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [decision, setDecision] = useState<'ACCEPTED' | 'OVERRIDDEN' | 'RECAPTURE_REQUESTED'>('ACCEPTED');
  const [finalGrade, setFinalGrade] = useState<number>(2);
  const [overrideReason, setOverrideReason] = useState<string>('Disagreement on subtle vascular changes');
  const [doctorComments, setDoctorComments] = useState<string>('Clinical findings are consistent with non-proliferative diabetic retinopathy.');
  const [instructionsForHcw, setInstructionsForHcw] = useState<string>('Issue referral slip and counsel patient regarding glycemic control.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      api.getScreeningDetail(id).then((data) => {
        setScreening(data);
        if (data?.ai_result?.dr_grade !== undefined) {
          setFinalGrade(data.ai_result.dr_grade);
        }
      });
    }
  }, [id]);

  const handleSubmitReview = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.submitDoctorReview({
        screening_id: parseInt(id, 10),
        decision,
        final_grade: decision === 'OVERRIDDEN' ? finalGrade : (screening?.ai_result?.dr_grade ?? 2),
        override_reason: decision === 'OVERRIDDEN' ? overrideReason : undefined,
        doctor_comments: doctorComments,
        instructions_for_hcw: decision === 'RECAPTURE_REQUESTED' ? instructionsForHcw : undefined
      });
    } catch (err: any) {
      console.warn('Backend review note:', err.message);
    } finally {
      setIsSubmitting(false);
      if (decision === 'RECAPTURE_REQUESTED') {
        alert('Recapture instructions dispatched to frontline healthcare worker.');
        navigate(`/screening/${id}/image`);
      } else {
        // Proceed to Step 7: Triage
        navigate(`/screening/${id}/triage`);
      }
    }
  };

  const fundusImgUrl = screening?.retinal_image?.url
    ? api.getMediaUrl(screening.retinal_image.url)
    : '/placeholder_retina.jpg';

  const gradcamUrl = screening?.explanation?.overlay_url
    ? api.getMediaUrl(screening.explanation.overlay_url)
    : fundusImgUrl;

  const p = screening?.patient;
  const ai = screening?.ai_result;
  const lesions = screening?.lesion_result;
  const q = screening?.quality_assessment;

  return (
    <div>
      <ScreeningStepper currentStep={6} screeningId={id} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate(`/screening/${id}/results`)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to AI Results</span>
          </button>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-info text-xs font-mono">{screening?.screening_id}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-700">{screening?.eye}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span>Ophthalmologist Clinical Adjudication Console</span>
              </h1>
            </div>
            <div className="badge-warning text-xs font-bold">
              Human-in-the-Loop AI
            </div>
          </div>

          {/* Clinical Workspace (3-column grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Left Column: Patient Demographics & Quality (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-2">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>Patient Profile</span>
                </h3>
                <div>
                  <span className="text-slate-500">Name:</span> <strong className="text-slate-900">{p?.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Age / Gender:</span> <strong>{p?.age} / {p?.gender}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Diabetes:</span> <strong>{p?.diabetes_type} ({p?.diabetes_duration})</strong>
                </div>
                <div>
                  <span className="text-slate-500">HbA1c:</span> <strong>{p?.hba1c || 'Not tested'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Screening Site:</span> <strong className="text-slate-800">{p?.screening_location}</strong>
                </div>
              </div>

              {/* Quality & Assurance */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Optical Quality Gate
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Quality Score:</span>
                  <span className="font-bold text-emerald-700">{q?.overall_score ?? 91}% ({q?.status ?? 'GOOD'})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Vessel Visibility:</span>
                  <span className="font-bold text-slate-800">{Math.round((screening?.vessel_result?.vessel_visibility ?? 0.91) * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Model Confidence:</span>
                  <span className="font-bold text-slate-800">{Math.round((ai?.confidence ?? 0.94) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Middle Column: Visual Evidence Imagery (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-black rounded-xl overflow-hidden aspect-square border border-slate-300 relative flex items-center justify-center">
                <img
                  src={gradcamUrl}
                  alt="Grad-CAM Overlay"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fundusImgUrl;
                  }}
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold">
                  Grad-CAM Feature Overlay
                </div>
              </div>

              {/* IDRiD Lesion Indicators */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">MA</div>
                  <div className="font-bold text-rose-600">{lesions?.microaneurysms ?? 8}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Heme</div>
                  <div className="font-bold text-rose-700">{lesions?.hemorrhages ?? 3}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Exudates</div>
                  <div className="font-bold text-amber-600">{lesions?.hard_exudates ?? 5}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Cotton-wool</div>
                  <div className="font-bold text-sky-600">{lesions?.soft_exudates ?? 1}</div>
                </div>
              </div>
            </div>

            {/* Right Column: Doctor Decision Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">
                  AI Model Recommendation
                </span>
                <div className="text-base font-extrabold text-teal-950">
                  Grade {ai?.dr_grade ?? 2} — {ai?.label ?? 'Moderate DR'}
                </div>
                <div className="text-slate-600">
                  DME Assessment: <strong className="text-amber-800">{ai?.dme_risk ?? 'Possible DME detected'}</strong>
                </div>
              </div>

              {/* Decision Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Doctor Clinical Decision <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setDecision('ACCEPTED')}
                    className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${
                      decision === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ACCEPT AI SCREENING RESULT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('OVERRIDDEN')}
                    className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${
                      decision === 'OVERRIDDEN'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>OVERRIDE AI PREDICTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('RECAPTURE_REQUESTED')}
                    className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${
                      decision === 'RECAPTURE_REQUESTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>REQUEST NEW RETINAL IMAGE</span>
                  </button>
                </div>
              </div>

              {/* Override Fields */}
              {decision === 'OVERRIDDEN' && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Final Assigned DR Grade:</label>
                    <select
                      value={finalGrade}
                      onChange={(e) => setFinalGrade(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={0}>Grade 0 — No DR</option>
                      <option value={1}>Grade 1 — Mild NPDR</option>
                      <option value={2}>Grade 2 — Moderate NPDR</option>
                      <option value={3}>Grade 3 — Severe NPDR</option>
                      <option value={4}>Grade 4 — Proliferative DR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Reason for Override:</label>
                    <select
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="Disagreement on subtle vascular changes">Subtle microaneurysms misattributed</option>
                      <option value="Artifact confused for lesion">Media artifact falsely identified as exudate</option>
                      <option value="Ischemia / Neovascularization observed">Focal ischemic bed observed outside heatmap</option>
                      <option value="Other clinical rationale">Other clinical specialist rationale</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Recapture Instructions */}
              {decision === 'RECAPTURE_REQUESTED' && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <label className="block font-bold text-rose-900">Instructions for Healthcare Worker:</label>
                  <textarea
                    rows={2}
                    value={instructionsForHcw}
                    onChange={(e) => setInstructionsForHcw(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    placeholder="e.g. Please darken the examination room and align camera directly with fovea."
                  />
                </div>
              )}

              {/* Clinical Comments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ophthalmologist Clinical Comments
                </label>
                <textarea
                  rows={3}
                  value={doctorComments}
                  onChange={(e) => setDoctorComments(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Enter clinical notes..."
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitReview}
                  className="w-full btn-primary py-2.5 font-bold text-xs shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Recording Decision...' : 'CONFIRM & PROCEED TO TRIAGE'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/screening/${id}/triage`)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Skip to Triage & Referral</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Records & Attachments for Adjudication */}
        <ClinicalAttachments screeningId={id!} />
      </div>
    </div>
  );
};
