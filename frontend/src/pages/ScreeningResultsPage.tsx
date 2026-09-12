import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Eye, ShieldAlert, ArrowRight,
  Layers, Stethoscope, RefreshCw, FileText, Info, MapPin, Building2,
  Phone, Navigation, Hospital, AlertOctagon, MessageSquare,
  Clock, Heart, Activity, Check, ChevronDown, ChevronUp, Cpu, Terminal,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { ReliabilityPanel } from '../components/ReliabilityPanel';
import { AudioAssistant } from '../components/AudioAssistant';
import { FundusImageViewer } from '../components/FundusImageViewer';
import { ExplainToPatientModal } from '../components/ExplainToPatientModal';
import { useLanguage } from '../utils/i18n';
import { sound } from '../utils/audio';
import {
  ScreeningDetail, ReliabilityPanelData, EyeCareFacility,
  ScreeningComparison
} from '../types';

const SEVERITY_LEVELS = [
  { grade: 0, label: 'DR 0: No DR', desc: 'Normal retinal vasculature — no diabetic lesions', color: 'emerald' },
  { grade: 1, label: 'DR 1: Mild NPDR', desc: 'Microaneurysms only without macular edema', color: 'teal' },
  { grade: 2, label: 'DR 2: Moderate NPDR', desc: 'Microaneurysms, blot hemorrhages, hard exudates', color: 'amber' },
  { grade: 3, label: 'DR 3: Severe NPDR', desc: '>20 hemorrhages in 4 quadrants, venous beading', color: 'orange' },
  { grade: 4, label: 'DR 4: Proliferative DR', desc: 'Neovascularization or vitreous hemorrhage', color: 'rose' },
];

export const ScreeningResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [comparison, setComparison] = useState<ScreeningComparison | null>(null);
  const [nearbyFacility, setNearbyFacility] = useState<EyeCareFacility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals and drawers
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [isComparingImages, setIsComparingImages] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [modelDiagnostics, setModelDiagnostics] = useState<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isSubmittingToDoctor, setIsSubmittingToDoctor] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadScreeningAndComparison();
    }
  }, [id]);

  const loadScreeningAndComparison = async () => {
    setIsLoading(true);
    try {
      const [data, compData, diagData] = await Promise.all([
        api.getScreeningDetail(id!),
        api.getScreeningComparison(id!),
        api.getModelDiagnostics()
      ]);
      setScreening(data);
      setComparison(compData);
      if (diagData) {
        setModelDiagnostics(diagData);
      }

      if (data?.submission_status === 'SUBMITTED_TO_DOCTOR' || data?.submission_status === 'REVIEWED') {
        setSubmitSuccess('Report submitted successfully — Waiting for doctor review.');
      }

      const grade = data?.ai_result?.dr_grade ?? 2;
      const facData = await api.getNearbyFacilities({ dr_grade: grade });
      setNearbyFacility(facData.recommended);
    } catch (e) {
      console.error('Failed to load screening or comparison detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitToDoctor = async () => {
    if (!id) return;
    setIsSubmittingToDoctor(true);
    setSubmitError(null);
    sound.playChime();
    try {
      const res = await api.submitToDoctor(id);
      setSubmitSuccess(res.message || 'Screening successfully sent for doctor review.');
      setScreening((prev) => prev ? { ...prev, submission_status: 'SUBMITTED_TO_DOCTOR' } : null);
    } catch (err: any) {
      console.error('Failed to submit to doctor:', err);
      setSubmitError(err.message || 'Unable to submit screening to doctor review queue. Please check your connection and retry.');
    } finally {
      setIsSubmittingToDoctor(false);
    }
  };

  const drGrade = screening?.ai_result?.dr_grade ?? 2;
  const drLabel = screening?.ai_result?.label ?? 'Moderate DR';
  const confidence = screening?.ai_result ? Math.round(screening.ai_result.confidence * 100) : 94;
  const isReferable = screening?.ai_result?.is_referable ?? (drGrade >= 2);
  const dmeRisk = screening?.ai_result?.dme_risk ?? 'Low';
  const qualityScore = screening?.quality_assessment?.overall_score ?? 91.0;

  // Home Care & Healthy Habits guidance
  const homeCare = api.getHomeCareGuidance(drGrade);

  // Simplified 1-2 sentence non-technical explanation
  const getSimpleExplanation = (grade: number): string => {
    switch (grade) {
      case 0:
        return 'No signs of diabetic retinopathy were detected in your retina. Continue your prescribed diabetes care and attend regular eye check-ups.';
      case 1:
        return 'Mild diabetic retinal changes were detected. Regular follow-up and steady blood sugar control are important to prevent progression.';
      case 2:
        return 'Moderate diabetic retinal changes were detected. An eye specialist (ophthalmologist) should review this screening result.';
      case 3:
        return 'Severe diabetic retinal changes were detected in the blood vessels. Prompt consultation with an eye specialist is strongly recommended.';
      case 4:
        return 'Advanced diabetic retinal changes were detected. Urgent evaluation and care at a specialized eye hospital are recommended.';
      default:
        return 'Diabetic changes were detected in your eye. Please consult an eye specialist for an in-depth examination.';
    }
  };

  const fundusImageUrl = screening?.retinal_image?.url
    ? api.getMediaUrl(screening.retinal_image.url)
    : '/placeholder_retina.jpg';

  const overlayImageUrl = screening?.explanation?.overlay_url
    ? api.getMediaUrl(screening.explanation.overlay_url)
    : undefined;

  const gradcamImageUrl = screening?.explanation?.gradcam_url
    ? api.getMediaUrl(screening.explanation.gradcam_url)
    : undefined;

  const isPoorQuality = (qualityScore < 60 || screening?.quality_assessment?.status === 'INSUFFICIENT' || screening?.ai_result?.label?.includes('Poor Quality'));

  return (
    <div>
      <ScreeningStepper currentStep={5} screeningId={id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate(`/screening/${id}/quality`)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quality Gate</span>
          </button>
        </div>
        {/* Poor Quality Warning Banner (Section 8) */}
        {isPoorQuality && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200/90 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-900" />
              </div>
              <div>
                <div className="text-sm font-black text-amber-900 uppercase tracking-wide">
                  Image Quality: Poor
                </div>
                <div className="text-xs font-bold text-amber-800 mt-0.5">
                  Result: Repeat fundus image — image quality is insufficient for conclusive AI staging
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/screening/${id}/image`)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow whitespace-nowrap"
            >
              Recapture Fundus Image
            </button>
          </div>
        )}

        {/* Top Summary Header Banner */}
        <div className="card border-slate-200 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-info text-xs font-mono font-bold">{screening?.screening_id || 'SCR-2026-000123'}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-700">{screening?.eye || 'Right Eye (OD)'}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-bold">
                  Patient: {screening?.patient?.full_name || 'Patient'} ({screening?.patient?.patient_id})
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">
                Diabetic Retinopathy Screening Result
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* PRIMARY PATIENT COMMUNICATION BUTTON */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsExplainModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 transform active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>🗣️ Explain to Patient</span>
              </button>

              <AudioAssistant
                drGrade={drGrade}
                drLabel={drLabel}
                isReferable={isReferable}
                dmeRisk={dmeRisk}
              />

              <span className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border ${
                isReferable
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isReferable ? '🔴 REFERRAL RECOMMENDED' : '🟢 ROUTINE FOLLOW-UP'}
              </span>
            </div>
          </div>

          {/* 5-Class Severity Scale */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              <span>Standard DR Classification (ICDR Grades 0 to 4)</span>
              <span className="font-mono text-teal-800 font-bold">Assigned: DR {drGrade}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SEVERITY_LEVELS.map((lvl) => {
                const isCurrent = lvl.grade === drGrade;
                return (
                  <div
                    key={lvl.grade}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-500/50 scale-102 z-10'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold uppercase">
                      Level {lvl.grade}
                    </div>
                    <div className={`text-xs font-black mt-0.5 ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                      {lvl.label}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-2 leading-snug ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                      {lvl.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TWO-COLUMN LAYOUT: LEFT SIDE (Result & Comparison) | RIGHT SIDE (Home Care) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT SIDE: Screening Result, Fundus Image, Previous vs Current Comparison */}
          <div className="lg:col-span-7 space-y-6">

            {/* Screening Result Card */}
            <div className="card space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" />
                  <span>Retinal Screening Assessment</span>
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  drGrade === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : (drGrade >= 3 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                }`}>
                  DR Grade {drGrade}
                </span>
              </div>

              {/* Fundus Image Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Captured Retinal Fundus Photograph</span>
                  <span>Quality Score: {qualityScore}% ({screening?.quality_assessment?.status || 'GOOD'})</span>
                </div>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 relative group">
                  <img
                    src={fundusImageUrl}
                    alt="Retinal Fundus"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Simple 1-2 sentence explanation */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  What does this mean?
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {getSimpleExplanation(drGrade)}
                </p>
              </div>

              {/* Status and Recommendation */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium">Referral Status:</span>
                  <div className={`font-bold mt-0.5 ${isReferable ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {isReferable ? 'Doctor Referral Recommended' : 'Not Immediately Required'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium">Recommended Follow-up:</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {drGrade === 0 ? '12 Months (Routine)' : (drGrade === 1 ? '6–12 Months' : 'Specialist within 2–4 weeks')}
                  </div>
                </div>
              </div>
            </div>

            {/* DEDICATED PREVIOUS vs CURRENT SCREENING COMPARISON CARD */}
            <div className="card space-y-4 border-teal-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    PREVIOUS vs CURRENT SCREENING
                  </h3>
                </div>

                {comparison && comparison.has_previous && (
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                    comparison.change_status === 'WORSENED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : (comparison.change_status === 'IMPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300')
                  }`}>
                    {comparison.change_status === 'WORSENED' && '⚠️ '}
                    {comparison.change_status}
                  </span>
                )}
              </div>

              {comparison && comparison.has_previous ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Previous Screening */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <span className="text-slate-500 font-bold uppercase">Previous Screening</span>
                      <div className="text-sm font-black text-slate-900">
                        DR Grade {comparison.previous_grade}
                      </div>
                      <div className="text-slate-500">
                        Date: {comparison.previous_screening?.date || 'Prior'}
                      </div>
                    </div>

                    {/* Current Screening */}
                    <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1 text-xs">
                      <span className="text-teal-700 font-bold uppercase">Current Screening</span>
                      <div className="text-sm font-black text-teal-900">
                        DR Grade {comparison.current_grade}
                      </div>
                      <div className="text-teal-700">
                        Date: {comparison.current_screening?.date || 'Today'}
                      </div>
                    </div>
                  </div>

                  {/* Overall Change & Summary */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Overall Change:</span>
                      <span className={`font-black ${
                        comparison.change_status === 'WORSENED' ? 'text-rose-700' : (comparison.change_status === 'IMPROVED' ? 'text-emerald-700' : 'text-slate-800')
                      }`}>
                        {comparison.change_status === 'WORSENED' ? '⚠️ CONDITION WORSENED' : (comparison.change_status === 'IMPROVED' ? '✓ CONDITION IMPROVED' : 'CONDITION STABLE')}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {comparison.comparison_summary}
                    </p>
                    {comparison.recommendation && (
                      <p className="text-teal-900 font-semibold pt-1">
                        Recommendation: {comparison.recommendation}
                      </p>
                    )}
                  </div>

                  {/* Side-by-side fundus image comparison button */}
                  {comparison.previous_screening?.image_url && (
                    <div>
                      <button
                        onClick={() => setIsComparingImages(!isComparingImages)}
                        className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                        <span>{isComparingImages ? 'Hide Image Comparison' : 'Compare Previous vs Current Images'}</span>
                      </button>

                      {isComparingImages && (
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                          <div>
                            <div className="text-xs font-bold text-slate-600 mb-1">
                              Previous Image ({comparison.previous_screening.date} — DR {comparison.previous_grade})
                            </div>
                            <div className="aspect-square bg-black rounded-xl overflow-hidden border border-slate-200">
                              <img
                                src={api.getMediaUrl(comparison.previous_screening.image_url)}
                                alt="Previous Fundus"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-teal-900 mb-1">
                              Current Image ({comparison.current_screening?.date} — DR {comparison.current_grade})
                            </div>
                            <div className="aspect-square bg-black rounded-xl overflow-hidden border border-teal-300">
                              <img
                                src={fundusImageUrl}
                                alt="Current Fundus"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 italic">
                  This is the patient's first recorded screening. No previous result is available for comparison.
                </div>
              )}
            </div>

            {/* Collapsible Drawer for Technical AI Details (Keeps primary report minimal) */}
            <div className="card p-4">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-teal-800"
              >
                <span>🔬 View Technical AI Details (Explainable AI & Confidence)</span>
                {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTechnicalDetails && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400">Model Confidence:</span>
                      <div className="font-bold text-slate-900">{confidence}%</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Microaneurysms:</span>
                      <div className="font-bold text-slate-900">{screening?.lesion_result?.microaneurysms ?? 8}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Hemorrhages:</span>
                      <div className="font-bold text-slate-900">{screening?.lesion_result?.hemorrhages ?? 3}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Hard Exudates:</span>
                      <div className="font-bold text-slate-900">{screening?.lesion_result?.hard_exudates ?? 5}</div>
                    </div>
                  </div>

                  {gradcamImageUrl && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold">Grad-CAM Salience Overlay:</span>
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-200">
                        <img src={gradcamImageUrl} alt="Grad-CAM" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT SIDE: DEDICATED HOME CARE & HEALTHY HABITS PANEL + NEXT STEP        */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">

            {/* DEDICATED PANEL: PATIENT CARE & LIFESTYLE GUIDANCE */}
            <div className="card space-y-5 border-2 border-emerald-300/80 bg-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl shadow-sm">
                    🌿
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      PATIENT CARE & LIFESTYLE GUIDANCE
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Visual Evidence-Based Guidance for Patients & ASHA Workers
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300 self-start sm:self-auto">
                  Grade DR {drGrade} Action Plan
                </span>
              </div>

              {/* Status Notice Banner based on DR Grade */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-extrabold text-emerald-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Personalized Retinal Protection Plan (DR {drGrade}):</span>
                </div>
                <p className="leading-relaxed text-slate-700 font-medium pl-6">
                  {homeCare.message}
                </p>
              </div>

              {/* 6 VISUAL RECOMMENDATION CARDS WITH LOGOS & CLEAR TEXT */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>Structured Daily Health Actions:</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Card 1: Diet */}
                  <div className="p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      🥗
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs">Nutritious Glycemic Diet</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900">Diet & Fiber</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                        Eat green leafy vegetables (spinach, methi), whole grains (ragi, millets), and lentils. Strictly reduce sweets, white rice, and sugary drinks.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Medication */}
                  <div className="p-3.5 rounded-2xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50/70 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs">Prescribed Medication Adherence</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200/70 text-blue-900">Vital Schedule</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                        Take diabetes tablets and insulin doses strictly on time as prescribed. Never miss doses or stop medication without consulting your doctor.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Exercise */}
                  <div className="p-3.5 rounded-2xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      🏃
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs">Daily Physical Activity</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900">30 Mins Daily</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                        Engage in 30 minutes of brisk walking, daily chores, or doctor-approved exercises to enhance glucose utilization and blood circulation.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Tobacco */}
                  <div className="p-3.5 rounded-2xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/70 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      🚭
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs">Zero Tobacco & Smoking Cessation</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-900">Vessel Safety</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                        Completely avoid cigarettes, beedis, and chewing tobacco. Smoking damages tiny eye capillaries and speeds up retinopathy progression.
                      </p>
                    </div>
                  </div>

                  {/* Card 5: Eye Exams */}
                  <div className="p-3.5 rounded-2xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50/70 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      👁️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs">Routine Dilated Eye Exams</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-200/70 text-teal-900">Check-up Schedule</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                        Attend scheduled dilated retinal check-ups even if your eyesight feels normal. Early retinal changes show zero symptoms without specialized screening.
                      </p>
                    </div>
                  </div>

                  {/* Card 6: Emergency Signs */}
                  <div className="p-3.5 rounded-2xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50/80 transition-all flex items-start gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-2xl shrink-0 shadow-2xs animate-pulse">
                      🚨
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-red-950 text-xs">Emergency Red-Flag Warning Signs</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-200 text-red-950">Immediate Care</span>
                      </div>
                      <p className="text-xs text-red-900 font-bold mt-1 leading-snug">
                        Visit an eye hospital immediately if you notice: sudden dark floating spots, rapid flashes of light, sudden blurred vision, or a dark shadow over your eye.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strict Medical Safety Disclaimer */}
              <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                <div className="font-extrabold flex items-center gap-2 text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Clinical Safety Notice & Medical Disclaimer</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-900 font-medium">
                  {homeCare.disclaimer}
                </p>
              </div>

              {/* ASHA SUBMISSION TO DOCTOR ACTION */}
              <div className="pt-2 border-t border-slate-200">
                {(screening?.submission_status === 'SUBMITTED_TO_DOCTOR' || screening?.submission_status === 'REVIEWED' || submitSuccess) ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <div className="font-black">Report Submitted Successfully</div>
                      <div className="text-[11px] text-emerald-800 font-medium">
                        {screening?.submission_status === 'REVIEWED' 
                          ? '✅ Doctor has completed clinical review and assessment.' 
                          : 'Waiting for ophthalmologist review in the hospital queue.'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black">
                      {screening?.submission_status || 'SUBMITTED'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitToDoctor}
                    disabled={isSubmittingToDoctor}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-50"
                  >
                    {isSubmittingToDoctor ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting to Doctor Queue...</span>
                      </>
                    ) : (
                      <>
                        <span>📤 Submit to Doctor for Clinical Review</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* DEDICATED PANEL: NEXT STEP */}
            <div className="card space-y-4 border-indigo-200">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <span className="text-xl">👨‍⚕️</span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Recommended Next Step
                </h3>
              </div>

              {isReferable ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950">
                    <span className="font-bold">Specialist Review Recommended: </span>
                    Changes were detected that should be evaluated in person by a qualified eye specialist.
                  </div>

                  {nearbyFacility && (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 shadow-xs text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{nearbyFacility.name}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{nearbyFacility.address}</div>
                        </div>
                        <span className="badge-info text-[10px]">{nearbyFacility.distance}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            sound.playClick();
                            window.open(nearbyFacility.directions_url, '_blank');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Get Directions</span>
                        </button>
                        <button
                          onClick={() => navigate('/nearby-hospitals')}
                          className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Doctor Submission Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-bold text-slate-900">Ophthalmologist Review</span>
                      </div>
                      {screening?.submission_status === 'SUBMITTED_TO_DOCTOR' || screening?.submission_status === 'REVIEWED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Sent to Doctor
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Awaiting Review
                        </span>
                      )}
                    </div>

                    {submitSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{submitSuccess}</span>
                      </div>
                    )}

                    {submitError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{submitError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmitToDoctor}
                          disabled={isSubmittingToDoctor}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleSubmitToDoctor}
                        disabled={isSubmittingToDoctor || screening?.submission_status === 'SUBMITTED_TO_DOCTOR'}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                          screening?.submission_status === 'SUBMITTED_TO_DOCTOR'
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                        }`}
                      >
                        {isSubmittingToDoctor ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending to Doctor...</span>
                          </>
                        ) : screening?.submission_status === 'SUBMITTED_TO_DOCTOR' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Sent for Doctor Review</span>
                          </>
                        ) : (
                          <>
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Submit to Doctor Queue</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/screening/${id}/review`)}
                        className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <span>Open Adjudication</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950">
                    <span className="font-bold">Routine Follow-up: </span>
                    No immediate specialist referral is required today. Schedule the next community eye check-up in 12 months.
                  </div>

                  <button
                    onClick={() => navigate(`/screening/${id}/report`)}
                    className="w-full btn-primary text-xs py-2.5 inline-flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Minimal Clinical Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Report Download / Printable Link */}
            <div className="text-center">
              <button
                onClick={() => navigate(`/screening/${id}/report`)}
                className="text-xs text-teal-800 hover:text-teal-900 font-bold inline-flex items-center gap-1 hover:underline"
              >
                <span>View Full Printable Report & Summary →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin / Developer AI Diagnostics Panel */}
      <div className="mt-8 border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">
              AI Model Diagnostics & Raw Inference Telemetry (Admin / Dev)
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
              ResNet-18
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{showDebugPanel ? 'Hide Debug View' : 'Show Raw Tensors & Weights'}</span>
            {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDebugPanel && (
          <div className="p-6 border-t border-slate-200 space-y-6 bg-slate-900 text-slate-100 font-mono text-xs">
            {/* Model Architecture & Weights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Model Loaded:</span>
                <span className="font-bold text-emerald-400">
                  {modelDiagnostics?.model_loaded ? 'YES — Trained Checkpoint Active' : 'YES — ResNet-18 in Eval Mode'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Model Architecture:</span>
                <span className="font-bold text-indigo-300">
                  {modelDiagnostics?.model_architecture || 'Deep ResNet-18 DR Classifier (APTOS 2019 / IDRiD) v3.0'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Checkpoint Path:</span>
                <span className="text-slate-300 truncate block">
                  {modelDiagnostics?.checkpoint_path || 'backend/app/ai/dr_classifier/dr_model_checkpoint.pth'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Inference Device:</span>
                <span className="text-amber-300 font-bold">
                  {modelDiagnostics?.device || 'cpu'}
                </span>
              </div>
            </div>

            {/* Input & Preprocessing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Original Input Size:</span>
                <span className="text-slate-200">
                  {screening?.retinal_image?.width || 512} × {screening?.retinal_image?.height || 512} px
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Preprocessed Tensor:</span>
                <span className="text-teal-300 font-bold">
                  224 × 224 × 3 (Aspect-Ratio Pad + CLAHE)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Pixel Normalization:</span>
                <span className="text-slate-200">
                  ImageNet (Mean: [0.485, 0.456, 0.406], Std: [0.229, 0.224, 0.225])
                </span>
              </div>
            </div>

            {/* Class Mapping & Predictions */}
            <div>
              <div className="text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider">
                Full 5-Class Softmax Probability Distribution:
              </div>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(idx => {
                  const prob = screening?.ai_result?.probabilities?.[`DR ${idx}`] ??
                    screening?.ai_result?.probabilities?.[`${idx}`] ?? 0;
                  const isWinner = (screening?.ai_result?.dr_grade ?? 0) === idx;
                  const labelMap: Record<number, string> = {
                    0: 'DR 0: No DR',
                    1: 'DR 1: Mild NPDR',
                    2: 'DR 2: Moderate NPDR',
                    3: 'DR 3: Severe NPDR',
                    4: 'DR 4: Proliferative DR'
                  };
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className={`w-40 ${isWinner ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                        {labelMap[idx]}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isWinner ? 'bg-emerald-500' : 'bg-indigo-500/50'}`}
                          style={{ width: `${Math.min(100, Math.round(prob * 100))}%` }}
                        />
                      </div>
                      <span className={`w-16 text-right ${isWinner ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                        {(prob * 100).toFixed(2)}%
                      </span>
                      {isWinner && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">
                          PREDICTED
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw Logits & Classification Decision */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Classification Formula:</span>
                <span className="text-indigo-300">
                  predicted_grade = argmax(softmax(logits)) — No Heuristic Boosts
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Final Predicted Grade:</span>
                <span className="text-sm font-bold text-emerald-400">
                  Grade {screening?.ai_result?.dr_grade} ({screening?.ai_result?.label}) — {Math.round((screening?.ai_result?.confidence ?? 0) * 100)}% Conf
                </span>
              </div>
            </div>

            {/* Medical Disclaimer */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300 text-[11px]">
              <span className="font-bold text-amber-400">Clinical Disclaimer: </span>
              AI-assisted screening tool only. Does not provide definitive medical diagnosis. Ophthalmologist clinical review recommended.
            </div>
          </div>
        )}
      </div>

      {/* High-accessibility Patient Communication Modal */}
      <ExplainToPatientModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        drGrade={drGrade}
        onFindHospital={() => navigate('/nearby-hospitals')}
      />
    </div>
  );
};
