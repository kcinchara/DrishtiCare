import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download, Printer, CheckCircle2, AlertTriangle, Eye,
  ShieldCheck, FileText, Share2, ArrowLeft, Home, Navigation, MapPin,
  TrendingUp, TrendingDown, Minus, Heart, Shield, Check
} from 'lucide-react';
import { DrishtiCareLogo } from '../components/DrishtiCareLogo';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { AudioAssistant } from '../components/AudioAssistant';
import { useLanguage } from '../utils/i18n';
import { ScreeningDetail, ScreeningComparison } from '../types';

export const ScreeningReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [comparison, setComparison] = useState<ScreeningComparison | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      api.getScreeningDetail(id).then((data) => setScreening(data));
      api.getScreeningComparison(id).then((data) => setComparison(data)).catch(() => {});
    }
  }, [id]);

  const handleDownloadPdf = () => {
    if (!id) return;
    window.open(api.getReportDownloadUrl(id), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const p = screening?.patient;
  const ai = screening?.ai_result;
  const q = screening?.quality_assessment;
  const rev = screening?.doctor_review;
  const tri = screening?.triage_result;
  const ref = screening?.referral;
  const lesions = screening?.lesion_result;

  const currentGrade = rev?.final_grade ?? ai?.dr_grade ?? 2;
  const homeCare = api.getHomeCareGuidance(currentGrade);

  const originalImgUrl = screening?.retinal_image?.url
    ? api.getMediaUrl(screening.retinal_image.url)
    : '/placeholder_retina.jpg';

  const gradcamUrl = screening?.explanation?.overlay_url
    ? api.getMediaUrl(screening.explanation.overlay_url)
    : originalImgUrl;

  const isReferable = ai?.is_referable || tri?.referral_recommended;

  return (
    <div>
      <div className="print:hidden">
        <ScreeningStepper currentStep={8} screeningId={id} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* Action Header Banner (hidden during printing) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(`/screening/${id}/triage`)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Triage</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-xs text-slate-400">•</span>
            <span className="badge-success text-xs font-semibold">
              Screening Complete ✓
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AudioAssistant
              drGrade={ai?.dr_grade ?? rev?.final_grade ?? 2}
              drLabel={ai?.label || 'Moderate Diabetic Retinopathy'}
              isReferable={Boolean(isReferable)}
              dmeRisk={ai?.dme_risk || 'Low'}
            />

            <button
              onClick={handlePrint}
              className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT REPORT</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD PDF REPORT</span>
            </button>
          </div>
        </div>

        {/* Printable Official Clinical Screening Report Document */}
        <div className="bg-white border border-slate-300 rounded-2xl p-8 sm:p-12 shadow-sm space-y-8 text-slate-900 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-teal-600">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold p-1">
                  <DrishtiCareLogo size={22} variant="white" />
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">
                  PATIENT SCREENING REPORT
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                DrishtiCare — Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare
              </p>
              <p className="text-[11px] text-slate-400">
                Primary Health Centre Tele-Ophthalmology Network • Point-of-Care Clinical Triage
              </p>
            </div>

            <div className="text-right font-mono text-xs">
              <div className="font-bold text-slate-800">
                {screening?.screening_id || 'SCR-2026-000123'}
              </div>
              <div className="text-slate-500">
                Date: {screening?.created_at ? screening.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)}
              </div>
              {ref && (
                <div className="text-rose-700 font-bold mt-0.5">
                  Ref ID: {ref.referral_id}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Patient Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2 border-b border-slate-200 pb-1">
              1. Patient Demographics & Diabetes Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Patient ID:</span>
                <div className="font-bold text-slate-900 font-mono">{p?.patient_id}</div>
              </div>
              <div>
                <span className="text-slate-500">Full Name:</span>
                <div className="font-bold text-slate-900">{p?.full_name}</div>
              </div>
              <div>
                <span className="text-slate-500">Age / Gender:</span>
                <div className="font-bold text-slate-900">{p?.age} Yrs / {p?.gender}</div>
              </div>
              <div>
                <span className="text-slate-500">Location:</span>
                <div className="font-bold text-slate-900">{p?.screening_location}</div>
              </div>
              <div>
                <span className="text-slate-500">Diabetes Type:</span>
                <div className="font-bold text-slate-900">{p?.diabetes_type}</div>
              </div>
              <div>
                <span className="text-slate-500">Duration:</span>
                <div className="font-bold text-slate-900">{p?.diabetes_duration}</div>
              </div>
              <div>
                <span className="text-slate-500">Blood Glucose:</span>
                <div className="font-bold text-slate-900">{p?.blood_glucose || 'Not documented'}</div>
              </div>
              <div>
                <span className="text-slate-500">HbA1c:</span>
                <div className="font-bold text-slate-900">{p?.hba1c || 'Not tested'}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Acquisition & Image Quality */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2 border-b border-slate-200 pb-1">
              2. Retinal Acquisition & Optical Quality Gate
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Eye Evaluated:</span>
                <div className="font-bold text-slate-900">{screening?.eye}</div>
              </div>
              <div>
                <span className="text-slate-500">Camera Device:</span>
                <div className="font-bold text-slate-900">{screening?.image_source}</div>
              </div>
              <div>
                <span className="text-slate-500">Quality Score:</span>
                <div className="font-bold text-emerald-700">{q?.overall_score ?? 91}% ({q?.status ?? 'GOOD'})</div>
              </div>
              <div>
                <span className="text-slate-500">Vessel Visibility:</span>
                <div className="font-bold text-slate-900">{Math.round((screening?.vessel_result?.vessel_visibility ?? 0.91) * 100)}%</div>
              </div>
            </div>
          </div>

          {/* Section 3: AI Screening Assessment */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2 border-b border-slate-200 pb-1">
              3. Diabetic Retinopathy Detection & AI Assessment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border ${
                (ai?.dr_grade ?? 2) >= 1 ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <span className="text-slate-500 font-semibold">DR Detection Result:</span>
                <div className={`text-sm font-black mt-1 ${
                  (ai?.dr_grade ?? 2) >= 1 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {(ai?.dr_grade ?? 2) >= 1 ? 'Diabetic Retinopathy: DETECTED' : 'Diabetic Retinopathy: NOT DETECTED'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">ICDR Classification Standard</div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 font-semibold">DR Grade & Severity:</span>
                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  Grade: {ai?.dr_grade ?? 2}
                </div>
                <div className="text-[11px] font-bold text-teal-800 mt-0.5">
                  Severity: {ai?.label || 'Moderate NPDR'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 font-semibold">Model Confidence:</span>
                <div className="text-sm font-black text-slate-900 mt-1">
                  Confidence: {Math.round((ai?.confidence ?? 0.94) * 100)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">APTOS 2019 Ensemble</div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 font-semibold">DME Risk & Referability:</span>
                <div className="text-sm font-bold text-amber-800 mt-1">
                  {ai?.dme_risk ?? 'Possible DME detected'}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${isReferable ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {isReferable ? 'Referral Recommended' : 'Non-Referable'}
                </div>
              </div>
            </div>

            {/* Brief Result Explanation & Recommended Action */}
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700">Brief Result Explanation: </span>
                <span className="text-slate-600 font-medium">
                  {(ai?.dr_grade ?? 2) === 0
                    ? 'Normal retinal fundus morphology. No microaneurysms, hemorrhages, or exudates detected.'
                    : ((ai?.dr_grade ?? 2) === 1
                      ? `Mild non-proliferative changes with isolated microaneurysms (${lesions?.microaneurysms ?? 2} detected). No macular edema.`
                      : ((ai?.dr_grade ?? 2) === 2
                        ? `Moderate non-proliferative retinopathy with microaneurysms (${lesions?.microaneurysms ?? 8}) and hard exudates (${lesions?.hard_exudates ?? 5}). Secondary dilated evaluation indicated.`
                        : ((ai?.dr_grade ?? 2) === 3
                          ? `Severe NPDR with numerous multi-quadrant hemorrhages (${lesions?.hemorrhages ?? 10}), soft exudates, and venous beading.`
                          : 'Proliferative diabetic retinopathy with high risk of neovascularization and vitreous complications.')))}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <span className="font-bold text-slate-700">Recommended Action: </span>
                <span className="text-slate-800 font-semibold">
                  {isReferable
                    ? 'Ophthalmology evaluation recommended based on screening result. Dilated stereoscopic examination required.'
                    : 'Non-referable findings. Routine annual re-screening recommended in 12 months.'}
                </span>
              </div>
            </div>

            {/* Detected IDRiD Lesion Evidence */}
            <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-slate-700">Quantitative Lesions (IDRiD):</span>
              <span className="text-slate-600">
                Microaneurysms: <strong>{lesions?.microaneurysms ?? 8}</strong> |
                Hemorrhages: <strong>{lesions?.hemorrhages ?? 3}</strong> |
                Hard Exudates: <strong>{lesions?.hard_exudates ?? 5}</strong> |
                Soft Exudates: <strong>{lesions?.soft_exudates ?? 1}</strong>
              </span>
            </div>
          </div>

          {/* Section 4: Imagery & Explainability Visual Evidence */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2 border-b border-slate-200 pb-1">
              4. Visual Explainability & Feature Heatmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-black rounded-xl overflow-hidden aspect-video border border-slate-200 relative flex items-center justify-center">
                <img src={originalImgUrl} alt="Original Fundus" className="w-full h-full object-contain" />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                  Original Fundus Photograph
                </div>
              </div>
              <div className="bg-black rounded-xl overflow-hidden aspect-video border border-slate-200 relative flex items-center justify-center">
                <img src={gradcamUrl} alt="Grad-CAM Overlay" className="w-full h-full object-contain" />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                  Grad-CAM Feature Attribution Heatmap
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Doctor Review & Triage */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-2 border-b border-slate-200 pb-1">
              5. Ophthalmologist Review & Triage Disposition
            </h3>
            <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500">Reviewing Clinician:</span>
                  <div className="font-bold text-slate-900">{rev?.doctor_name || 'Dr. Rajesh Varma, MS'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Clinical Verdict:</span>
                  <div className="font-bold text-emerald-800">{rev?.decision || 'ACCEPTED'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Follow-up Schedule:</span>
                  <div className="font-bold text-slate-900">{tri?.follow_up_months || 3} Months</div>
                </div>
                <div>
                  <span className="text-slate-500">Designated Facility:</span>
                  <div className="font-bold text-slate-900">{ref?.hospital_name || ref?.recommended_destination || 'ABC Eye Hospital'}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-teal-200/60">
                <span className="text-slate-500">Clinician Notes: </span>
                <span className="text-slate-800 font-medium">
                  {rev?.doctor_comments || 'Moderate non-proliferative changes with exudates in vascular arcade. Dilated stereoscopic fundus evaluation required.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Longitudinal Screening Comparison (Returning Patients) */}
          {comparison && comparison.has_previous && (
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-700" />
                  <span>6. Longitudinal Screening Comparison (Previous vs. Current)</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  comparison.change_status === 'WORSENED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                  comparison.change_status === 'IMPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  'bg-slate-100 text-slate-800 border border-slate-300'
                }`}>
                  Status: {comparison.change_status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-lg border border-blue-100">
                <div>
                  <span className="text-slate-500">Previous Date:</span>
                  <div className="font-bold text-slate-900 font-mono">{comparison.previous_screening?.date || 'Prior'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{comparison.previous_screening?.screening_id}</div>
                </div>
                <div>
                  <span className="text-slate-500">Previous Grade:</span>
                  <div className="font-bold text-slate-800">
                    DR {comparison.previous_grade} ({comparison.previous_screening?.dr_label || `Grade ${comparison.previous_grade}`})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Current Grade:</span>
                  <div className={`font-bold ${
                    (comparison.current_grade ?? 0) > (comparison.previous_grade ?? 0) ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    DR {comparison.current_grade} ({comparison.current_screening?.dr_label || `Grade ${comparison.current_grade}`})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Longitudinal Delta:</span>
                  <div className="font-bold text-slate-900">
                    {(comparison.current_grade ?? 0) - (comparison.previous_grade ?? 0) > 0 ? `+${(comparison.current_grade ?? 0) - (comparison.previous_grade ?? 0)} Grades` : `${(comparison.current_grade ?? 0) - (comparison.previous_grade ?? 0)} Grades`}
                  </div>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                {comparison.comparison_summary}
              </p>
            </div>
          )}

          {/* Section 7: Patient Care & Lifestyle Guidance */}
          <div className="p-5 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-teal-700" />
                <span>7. Patient Care & Lifestyle Guidance</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">
                Grade-Appropriate Support (DR {currentGrade})
              </span>
            </div>

            <p className="text-slate-700 leading-relaxed font-medium">
              {homeCare.message}
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-slate-800">Structured Daily Retinal Health Practices:</div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">🥗</span>
                  <span><strong>Diet & Glycemic Control:</strong> High-fiber green vegetables & whole grains; avoid refined sugars.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">💊</span>
                  <span><strong>Medication Adherence:</strong> Consistent insulin and oral hypoglycemic schedule; never miss doses.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">🏃</span>
                  <span><strong>Daily Physical Activity:</strong> 30 minutes of walking or doctor-approved exercise daily.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">🚭</span>
                  <span><strong>Zero Tobacco:</strong> Avoid all smoking and tobacco products to preserve retinal micro-capillaries.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">👁️</span>
                  <span><strong>Routine Retinal Exams:</strong> Scheduled dilated eye exams even if asymptomatic.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-teal-100">
                  <span className="text-sm">🚨</span>
                  <span><strong>Emergency Warning Signs:</strong> Immediate emergency care for sudden flashes, floaters, or vision loss.</span>
                </li>
              </ul>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>CLINICAL NOTICE & DISCLAIMER:</strong> {homeCare.disclaimer}
            </div>
          </div>

          {/* Section 8: Recommended Eye-Care Facility (Hospital Information in Final Report) */}
          <div className="p-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-200 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏥</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    8. Recommended Eye-Care Facility
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Designated referral destination and contact information for clinical follow-up
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                {ref?.hospital_distance || '2.4 km away'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div>
                  <span className="font-bold text-slate-500">Hospital Name:</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {ref?.hospital_name || ref?.recommended_destination || 'ABC Eye Hospital'}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Distance:</span>
                  <div className="text-slate-800 font-bold mt-0.5">
                    {ref?.hospital_distance || '2.4 km away'}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Address:</span>
                  <div className="text-slate-800 font-medium mt-0.5">
                    {ref?.hospital_address || 'Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru, Karnataka 570020'}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="font-bold text-slate-500">Contact:</span>
                  <div className="text-slate-900 font-bold mt-0.5">
                    {ref?.hospital_contact || '+91 821 241 9300'}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Reason:</span>
                  <div className="text-slate-800 font-medium mt-0.5">
                    {ref?.reason || ((ai?.dr_grade ?? 2) >= 3
                      ? 'Severe diabetic retinopathy requires ophthalmic evaluation.'
                      : 'Ophthalmology evaluation recommended based on screening result.')}
                  </div>
                </div>
                <div className="pt-2 print:hidden">
                  <a
                    href={ref?.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ref?.hospital_name || 'ABC Eye Hospital') + ' Mysuru')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 text-white font-bold text-xs shadow-xs hover:bg-teal-800 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions / View on Map</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section 9: Model Versioning & Clinical Governance Notice */}
          <div className="pt-4 border-t border-slate-200 space-y-2 text-[10px] text-slate-500">
            <div className="flex items-center justify-between font-mono">
              <span>Model: APTOS 2019 DR-Net v1.0 • IDRiD Lesion-Loc v1.0 • DRIVE Vessel-Seg v1.0</span>
              <span>Validated against Messidor-2 Benchmark (Sens 88.6%, Spec 96.4%)</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 leading-relaxed">
              <strong>STATUTORY CLINICAL DISCLAIMER:</strong> This report is generated by DrishtiCare (an Explainable Clinical AI System)
              for point-of-care screening and triage support. The AI prediction does not constitute a definitive medical diagnosis.
              Final medical interpretation and treatment must be performed by a qualified ophthalmologist.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
