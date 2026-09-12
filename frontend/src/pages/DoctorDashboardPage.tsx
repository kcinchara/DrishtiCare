import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, AlertOctagon, Flame, ShieldAlert, CheckCircle2,
  Clock, Eye, Search, Filter, ChevronRight, FileText, ArrowUpRight,
  Layers, Hospital, ArrowRight, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningListItem, ScreeningDetail, ScreeningComparison } from '../types';
import { sound } from '../utils/audio';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState<ScreeningListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'URGENT' | 'MODERATE' | 'ROUTINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'OVERRIDDEN'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  // Quick Adjudication / Returning Patient Review Modal
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScreeningDetail | null>(null);
  const [comparison, setComparison] = useState<ScreeningComparison | null>(null);
  const [isComparingImages, setIsComparingImages] = useState(false);

  // Review Form state
  const [reviewGrade, setReviewGrade] = useState<number>(2);
  const [reviewDecision, setReviewDecision] = useState<'ACCEPTED' | 'OVERRIDDEN'>('ACCEPTED');
  const [doctorComments, setDoctorComments] = useState('');
  const [instructionsForHcw, setInstructionsForHcw] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const currentUser = api.getCurrentUser();
  const doctorName = currentUser?.full_name?.startsWith('Dr.') ? currentUser?.full_name : `Dr. ${currentUser?.full_name || 'Rajesh Varma, MS'}`;

  useEffect(() => {
    loadDoctorQueue();
  }, []);

  const loadDoctorQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.listScreenings();
      setScreenings(data || []);
    } catch (e) {
      console.error('Failed to load doctor queue:', e);
      setScreenings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseGradeNum = (gradeStr: string): number => {
    if (!gradeStr) return 0;
    const match = gradeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const isPending = (s: ScreeningListItem): boolean => {
    return s.status === 'DOCTOR_REVIEW' || s.doctor_decision === 'Pending Review' || !s.doctor_decision || s.doctor_decision === 'PENDING';
  };

  // Sort queue by clinical severity:
  // 🔴 DR 4 & DR 3 (Urgent) -> 🟠 DR 2 (Moderate) -> 🟡 DR 1 (Mild) -> 🟢 DR 0 (No DR)
  // With pending reviews appearing first
  const sortedScreenings = [...screenings].sort((a, b) => {
    const pA = isPending(a) ? 1 : 0;
    const pB = isPending(b) ? 1 : 0;
    if (pB !== pA) return pB - pA;
    return parseGradeNum(b.dr_grade) - parseGradeNum(a.dr_grade);
  });

  // Filtered screenings
  const filteredQueue = sortedScreenings.filter(row => {
    const matchesSearch =
      (row.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.patient_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.screening_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const g = parseGradeNum(row.dr_grade);
    if (severityFilter === 'URGENT' && g < 3) return false;
    if (severityFilter === 'MODERATE' && g !== 2) return false;
    if (severityFilter === 'ROUTINE' && g > 1) return false;

    if (statusFilter === 'PENDING' && !isPending(row)) return false;
    if (statusFilter === 'ACCEPTED' && row.doctor_decision !== 'ACCEPTED') return false;
    if (statusFilter === 'OVERRIDDEN' && row.doctor_decision !== 'OVERRIDDEN') return false;

    return true;
  });

  // Open Clinical Case Review Modal
  const openCaseReview = async (s: ScreeningListItem) => {
    sound.playClick();
    setSelectedScreeningId(String(s.id));
    setDetail(null);
    setComparison(null);
    setIsComparingImages(false);

    try {
      const [d, c] = await Promise.all([
        api.getScreeningDetail(String(s.id)),
        api.getScreeningComparison(String(s.id))
      ]);
      setDetail(d);
      setComparison(c);
      const initialGrade = d?.doctor_review?.final_grade ?? d?.ai_result?.dr_grade ?? 2;
      setReviewGrade(initialGrade);
      setReviewDecision(d?.doctor_review?.decision === 'OVERRIDDEN' ? 'OVERRIDDEN' : 'ACCEPTED');
      setDoctorComments(d?.doctor_review?.doctor_comments || 'Retinal examination findings reviewed and compatible with clinical assessment.');
      setInstructionsForHcw(d?.doctor_review?.instructions_for_hcw || 'Counsel patient regarding glycemic control and specialist consultation.');
    } catch (e) {
      console.error('Failed to load screening review detail:', e);
    }
  };

  const closeCaseReview = () => {
    sound.playClick();
    setSelectedScreeningId(null);
    setDetail(null);
    setComparison(null);
  };

  // Submit doctor review
  const handleSubmitReview = async () => {
    if (!selectedScreeningId) return;
    setIsSubmittingReview(true);
    sound.playClick();
    try {
      await api.submitDoctorReview({
        screening_id: Number(selectedScreeningId),
        decision: reviewDecision,
        final_grade: reviewGrade,
        override_reason: reviewDecision === 'OVERRIDDEN' ? 'Ophthalmologist clinical override based on vascular exam' : undefined,
        doctor_comments: doctorComments,
        instructions_for_hcw: instructionsForHcw
      });
      await loadDoctorQueue();
      closeCaseReview();
    } catch (e: any) {
      alert('Failed to submit doctor review: ' + (e.message || 'Unknown error'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Counts
  const totalQueue = screenings.length;
  const pendingReviews = screenings.filter(isPending).length;
  const urgentCount = screenings.filter(s => parseGradeNum(s.dr_grade) >= 3).length;
  const moderateCount = screenings.filter(s => parseGradeNum(s.dr_grade) === 2).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Banner - Clinical Ophthalmologist Workspace */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Ophthalmology Clinical Workstation • Human-in-the-Loop</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {doctorName}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Severity-prioritized clinical review queue. Review AI predictions, Grad-CAM explanations, and automatic previous vs current comparisons for returning patients.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { sound.playClick(); loadDoctorQueue(); }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
            <button
              onClick={() => navigate('/nearby-hospitals')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Hospital className="w-3.5 h-3.5" />
              <span>Hospital Referral Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Priority Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-amber-500 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Pending Adjudication</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-600">{pendingReviews}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting clinical sign-off</p>
        </div>

        <div className="card p-5 border-l-4 border-l-rose-600 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Urgent Cases (DR 3 / 4)</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-rose-700">{urgentCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">High-priority intervention</p>
        </div>

        <div className="card p-5 border-l-4 border-l-orange-500 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Moderate NPDR (DR 2)</span>
            <ShieldAlert className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-orange-600">{moderateCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Specialist review indicated</p>
        </div>

        <div className="card p-5 border-l-4 border-l-teal-600 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Queue</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900">{totalQueue}</div>
          <p className="text-[11px] text-slate-500 mt-1">All screenings on file</p>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="card grid grid-cols-1 md:grid-cols-12 gap-3 py-4">
        <div className="md:col-span-5 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID, or screening code..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="md:col-span-4 flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Severity:</span>
          {(['ALL', 'URGENT', 'MODERATE', 'ROUTINE'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                severityFilter === sev
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
          {(['PENDING', 'ALL'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Prioritized Clinical Queue Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900">Clinical Triage & Review Queue</h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Showing {filteredQueue.length} of {screenings.length} cases
          </span>
        </div>

        <div className="overflow-x-auto responsive-table-wrapper">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Patient Code</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">AI Prediction</th>
                <th className="py-3 px-4">DME Risk</th>
                <th className="py-3 px-4">Doctor Verdict</th>
                <th className="py-3 px-4 text-right">Adjudicate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map(s => {
                const g = parseGradeNum(s.dr_grade);
                const pending = isPending(s);
                return (
                  <tr
                    key={s.id}
                    onClick={() => openCaseReview(s)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      {g >= 3 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                          🚨 URGENT
                        </span>
                      ) : g === 2 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                          🟠 REVIEW
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                          ROUTINE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-900">
                      {s.patient_code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.patient_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {s.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        g === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (g >= 3 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200')
                      }`}>
                        {s.dr_grade} • {s.dr_label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {s.dme_risk.includes('Possible') || s.dme_risk.includes('High') ? (
                        <span className="text-rose-700 font-bold">⚠️ {s.dme_risk}</span>
                      ) : (
                        <span className="text-slate-500">Low</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {pending ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending Review
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">
                          ✓ {s.doctor_decision}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCaseReview(s);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Clinical Adjudication & Comparison Modal */}
      {selectedScreeningId && detail && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-info text-xs font-mono font-bold">{detail.screening_id}</span>
                  <span className="text-xs text-slate-500">Patient: {detail.patient?.full_name} ({detail.patient?.patient_id})</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-700">{detail.eye}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Ophthalmology Clinical Adjudication & Comparison
                </h2>
              </div>
              <button
                onClick={closeCaseReview}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Returning Patient Longitudinal Comparison Section */}
            {comparison && comparison.has_previous ? (
              <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-700" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      RETURNING PATIENT: PREVIOUS vs CURRENT SCREENING COMPARISON
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                    comparison.change_status === 'WORSENED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : (comparison.change_status === 'IMPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300')
                  }`}>
                    {comparison.change_status === 'WORSENED' && '⚠️ '}
                    TREND: {comparison.change_status}
                  </span>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto bg-white rounded-xl border border-indigo-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="py-2.5 px-4">Parameter</th>
                        <th className="py-2.5 px-4">Previous Screening ({comparison.previous_screening?.date})</th>
                        <th className="py-2.5 px-4">Current Screening ({comparison.current_screening?.date})</th>
                        <th className="py-2.5 px-4">Change Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-700">DR Grade</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">DR {comparison.previous_grade}</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-900">DR {comparison.current_grade}</td>
                        <td className="py-2.5 px-4 font-extrabold">
                          <span className={comparison.change_status === 'WORSENED' ? 'text-rose-700' : (comparison.change_status === 'IMPROVED' ? 'text-emerald-700' : 'text-slate-700')}>
                            DR {comparison.previous_grade} → DR {comparison.current_grade} ({comparison.change_status})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-700">AI Prediction</td>
                        <td className="py-2.5 px-4">DR {comparison.previous_screening?.ai_grade ?? comparison.previous_grade}</td>
                        <td className="py-2.5 px-4 font-semibold text-indigo-700">DR {comparison.current_screening?.ai_grade ?? comparison.current_grade}</td>
                        <td className="py-2.5 px-4 text-slate-600">Model inference</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-700">Doctor Grade</td>
                        <td className="py-2.5 px-4">{comparison.previous_screening?.doctor_grade !== null && comparison.previous_screening?.doctor_grade !== undefined ? `DR ${comparison.previous_screening.doctor_grade} (Confirmed)` : 'AI Grade Adopted'}</td>
                        <td className="py-2.5 px-4 text-amber-700 font-semibold">{detail.doctor_review?.final_grade !== null && detail.doctor_review?.final_grade !== undefined ? `DR ${detail.doctor_review.final_grade}` : 'Pending Adjudication'}</td>
                        <td className="py-2.5 px-4 text-slate-600">Human-in-the-loop</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-slate-700">Microvascular Findings</td>
                        <td className="py-2.5 px-4">
                          MAs: {comparison.previous_screening?.findings?.microaneurysms ?? 0} • Hem: {comparison.previous_screening?.findings?.hemorrhages ?? 0}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-indigo-900">
                          MAs: {comparison.current_screening?.findings?.microaneurysms ?? 0} • Hem: {comparison.current_screening?.findings?.hemorrhages ?? 0}
                        </td>
                        <td className="py-2.5 px-4">
                          {comparison.change_status === 'WORSENED' ? (
                            <span className="text-rose-700 font-bold">Increased lesion severity</span>
                          ) : (
                            <span className="text-slate-600">Stable / reduced lesion counts</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-600 italic">
                    <b>Summary:</b> {comparison.comparison_summary}
                  </p>
                  {comparison.previous_screening?.image_url && (
                    <button
                      onClick={() => setIsComparingImages(!isComparingImages)}
                      className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isComparingImages ? 'Hide Image Comparison' : 'Compare Fundus Images Side-by-Side'}</span>
                    </button>
                  )}
                </div>

                {/* Side by side image comparator */}
                {isComparingImages && comparison.previous_screening?.image_url && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-indigo-200">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-700">
                        Previous Fundus Image ({comparison.previous_screening.date} — DR {comparison.previous_grade})
                      </div>
                      <div className="aspect-square bg-black rounded-xl overflow-hidden border border-slate-300">
                        <img
                          src={api.getMediaUrl(comparison.previous_screening.image_url)}
                          alt="Previous Fundus"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-indigo-900">
                        Current Fundus Image ({comparison.current_screening?.date} — DR {comparison.current_grade})
                      </div>
                      <div className="aspect-square bg-black rounded-xl overflow-hidden border border-indigo-400">
                        <img
                          src={detail.retinal_image?.url ? api.getMediaUrl(detail.retinal_image.url) : '/placeholder_retina.jpg'}
                          alt="Current Fundus"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                ℹ️ <b>First Screening:</b> This is the patient's first recorded screening. No previous result is available for comparison.
              </div>
            )}

            {/* Current Fundus & Grad-CAM Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fundus Photograph</h4>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img
                    src={detail.retinal_image?.url ? api.getMediaUrl(detail.retinal_image.url) : '/placeholder_retina.jpg'}
                    alt="Fundus"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grad-CAM Explainable AI Heatmap</h4>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img
                    src={detail.explanation?.combined_url ? api.getMediaUrl(detail.explanation.combined_url) : (detail.retinal_image?.url ? api.getMediaUrl(detail.retinal_image.url) : '/placeholder_retina.jpg')}
                    alt="Grad-CAM"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Section 1: AI Prediction & Lesions Breakdown */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>1. Automated Multi-Modal AI Screening Result</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">AI Predicted Grade:</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    DR {detail.ai_result?.dr_grade ?? 2} ({detail.ai_result?.label ?? 'Moderate DR'})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">AI Confidence:</span>
                  <div className="text-base font-black text-indigo-700 mt-0.5">
                    {Math.round((detail.ai_result?.confidence ?? 0.94) * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">DME Risk:</span>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {detail.ai_result?.dme_risk ?? 'Low'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Image Quality:</span>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {detail.quality_assessment?.overall_score ?? 91}% ({detail.quality_assessment?.status ?? 'GOOD'})
                  </div>
                </div>
              </div>

              {/* Quantitative Lesions (IDRiD) */}
              {detail.lesion_result && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-slate-400 text-[10px] font-bold">Microaneurysms</div>
                    <div className="font-extrabold text-rose-600 text-sm mt-0.5">{detail.lesion_result.microaneurysms ?? 0}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-slate-400 text-[10px] font-bold">Hemorrhages</div>
                    <div className="font-extrabold text-rose-700 text-sm mt-0.5">{detail.lesion_result.hemorrhages ?? 0}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-slate-400 text-[10px] font-bold">Hard Exudates</div>
                    <div className="font-extrabold text-amber-600 text-sm mt-0.5">{detail.lesion_result.hard_exudates ?? 0}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-slate-400 text-[10px] font-bold">Cotton-wool spots</div>
                    <div className="font-extrabold text-sky-600 text-sm mt-0.5">{detail.lesion_result.soft_exudates ?? 0}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Doctor Clinical Adjudication Form */}
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>2. Ophthalmologist Clinical Assessment & Sign-Off</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Clinical Decision:
                  </label>
                  <select
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value as any)}
                    className="w-full py-2.5 px-3 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="ACCEPTED">ACCEPT AI Grade ({detail.ai_result?.dr_grade ?? 2})</option>
                    <option value="OVERRIDDEN">OVERRIDE Grade (Assign Custom Level)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Doctor Confirmed Final Grade:
                  </label>
                  <select
                    value={reviewGrade}
                    onChange={(e) => setReviewGrade(parseInt(e.target.value, 10))}
                    disabled={reviewDecision === 'ACCEPTED' && detail.ai_result?.dr_grade !== undefined}
                    className="w-full py-2.5 px-3 text-xs rounded-xl border border-slate-300 bg-white font-bold text-indigo-900"
                  >
                    <option value={0}>DR 0 — No Apparent Retinopathy</option>
                    <option value={1}>DR 1 — Mild NPDR</option>
                    <option value={2}>DR 2 — Moderate NPDR</option>
                    <option value={3}>DR 3 — Severe NPDR</option>
                    <option value={4}>DR 4 — Proliferative DR (PDR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ophthalmologist Clinical Comments:
                </label>
                <textarea
                  rows={2}
                  value={doctorComments}
                  onChange={(e) => setDoctorComments(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Enter specific retinal lesion observations or clinical recommendations..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instructions for ASHA Worker / Community Healthcare Team:
                </label>
                <input
                  type="text"
                  value={instructionsForHcw}
                  onChange={(e) => setInstructionsForHcw(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Schedule patient for hospital dilated exam within 2 weeks"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={closeCaseReview}
                className="btn-secondary text-xs px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="btn-primary bg-indigo-700 hover:bg-indigo-800 text-xs px-6 py-2.5 shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingReview ? 'Signing Off...' : 'Confirm Clinical Assessment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
