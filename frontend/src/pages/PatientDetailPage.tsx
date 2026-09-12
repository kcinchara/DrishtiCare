import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Calendar, TrendingUp, History, Eye, MapPin,
  Stethoscope, ArrowLeft, FileText, AlertTriangle, PlusCircle,
  TrendingDown, Minus, CheckCircle, ShieldAlert, Pill, FileCode
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { Patient, PatientHistoryResponse, PatientHistoryTimelineItem } from '../types';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<PatientHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingScreening, setIsStartingScreening] = useState(false);
  const [selectedEye, setSelectedEye] = useState<'Right Eye' | 'Left Eye'>('Right Eye');
  const [showEyeModal, setShowEyeModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadPatientDetails();
    }
  }, [id]);

  const loadPatientDetails = async () => {
    setIsLoading(true);
    try {
      const [p, h] = await Promise.all([
        api.getPatient(id!),
        api.getPatientHistory(id!)
      ]);
      setPatient(p || null);
      setHistory(h || null);
    } catch (e) {
      console.error('Error loading patient detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScreening = async () => {
    if (!patient?.id) return;
    setIsStartingScreening(true);
    sound.playClick();
    try {
      const scr = await api.createScreening(patient.id, selectedEye, 'Fundus Camera');
      setShowEyeModal(false);
      navigate(`/screening/${scr.id}/image`);
    } catch (err: any) {
      alert('Failed to initialize screening: ' + (err.message || 'Unknown error'));
      setIsStartingScreening(false);
    }
  };

  // Build chart progression data from chronological timeline
  // timeline in history.screenings is returned most-recent first from backend, reverse for chronological chart
  const chronologicalScreenings = history?.screenings ? [...history.screenings].reverse() : [];

  const chartData = chronologicalScreenings.map((s, idx) => ({
    screeningCode: s.screening_id,
    date: s.date || `Session ${idx + 1}`,
    grade: s.dr_grade,
    label: s.dr_label,
    eye: s.eye,
    doctorFinalGrade: s.doctor_final_grade
  }));

  const trajectory = history?.overall_trajectory || 'STABLE';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/history')}
          className="btn-secondary text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Directory</span>
        </button>

        <button
          onClick={() => setShowEyeModal(true)}
          className="btn-primary text-xs py-2 px-4 shadow-sm inline-flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Screening for this Patient</span>
        </button>
      </div>

      {/* Patient Profile Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {patient?.full_name || 'Patient Profile'}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {patient?.patient_id}
                </span>
                {history?.total_screenings !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {history.total_screenings} Screening{history.total_screenings === 1 ? '' : 's'} on Record
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {patient?.age} Years • {patient?.gender} • {patient?.diabetes_type || 'Type 2 Diabetes'} • Duration: {patient?.diabetes_duration || 'Not stated'}
              </p>
            </div>
          </div>

          {/* Trajectory pill */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Microvascular Trajectory</div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                {trajectory === 'IMPROVED' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                    <span>IMPROVED TRAJECTORY</span>
                  </span>
                )}
                {trajectory === 'STABLE' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                    <span>STABLE FINDINGS</span>
                  </span>
                )}
                {trajectory === 'WORSENED' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-700" />
                    <span>DISEASE PROGRESSION DETECTED</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Demographics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
          <div>
            <span className="text-slate-500">Screening Site:</span>
            <div className="font-bold text-slate-900">{patient?.screening_location || 'Rural Health PHC'}</div>
          </div>
          <div>
            <span className="text-slate-500">Contact Number:</span>
            <div className="font-bold text-slate-900">{patient?.contact_number || 'Not provided'}</div>
          </div>
          <div>
            <span className="text-slate-500">Random Blood Glucose:</span>
            <div className="font-bold text-slate-900">{patient?.blood_glucose ? `${patient.blood_glucose} mg/dL` : 'Not recorded'}</div>
          </div>
          <div>
            <span className="text-slate-500">HbA1c Level:</span>
            <div className="font-bold text-slate-900">{patient?.hba1c ? `${patient.hba1c}%` : 'Not tested'}</div>
          </div>
        </div>

        {/* Extended Medical History & Risk Factors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Medical History</span>
            </div>
            <p className="text-slate-600">
              {patient?.medical_history || patient?.previous_dr_history || 'No prior ocular or systemic medical history noted.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Pill className="w-3.5 h-3.5 text-blue-600" />
              <span>Current Medications</span>
            </div>
            <p className="text-slate-600">
              {patient?.current_medications || patient?.treatment_info || 'Metformin 500mg daily / Routine oral hypoglycemics.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Risk Factors</span>
            </div>
            <p className="text-slate-600">
              {patient?.risk_factors || 'Hypertension, Dyslipidemia, Longstanding DM.'}
            </p>
          </div>
        </div>
      </div>

      {/* Longitudinal DR Grade Progression Chart */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>Longitudinal Diabetic Retinopathy Progression Timeline</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks DR grade severity across sequential screening encounters (DR 0 = Normal, DR 1 = Mild, DR 2 = Moderate, DR 3 = Severe, DR 4 = Proliferative)
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            trajectory === 'WORSENED' ? 'bg-rose-100 text-rose-800' :
            trajectory === 'IMPROVED' ? 'bg-emerald-100 text-emerald-800' :
            'bg-slate-100 text-slate-800'
          }`}>
            {trajectory === 'WORSENED' ? 'Progression Flagged' : (trajectory === 'IMPROVED' ? 'Regression / Healing' : 'Stable Microvasculature')}
          </span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis
                  domain={[0, 4]}
                  ticks={[0, 1, 2, 3, 4]}
                  tickFormatter={(val) => `Grade ${val}`}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: any) => [`DR Grade ${value}`, 'Disease Severity']}
                  labelFormatter={(label) => `Encounter Date: ${label}`}
                />
                <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Referral Threshold (Grade 2+)', fill: '#e11d48', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="grade"
                  stroke="#0d9488"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No historical screening data points recorded yet.
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>
            {trajectory === 'WORSENED'
              ? '⚠️ Longitudinal alert: Retinal microvascular lesions have escalated compared to previous screenings. Specialist ophthalmic referral is strongly advised.'
              : (trajectory === 'IMPROVED'
                ? '✅ Positive trajectory: Retinal lesions or edema have decreased compared to prior examinations. Continue glycemic compliance.'
                : 'ℹ️ Stable trajectory: Findings remain unchanged across consecutive screening sessions.')}
          </span>
          <span className="font-bold text-teal-800 shrink-0 ml-2 font-mono">
            {chartData.length} Session Data Point{chartData.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Historical Screenings Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Historical Screening Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete chronological audit trail for Patient {patient?.patient_id}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {history?.screenings?.length || 0} Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Screening ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Eye</th>
                <th className="py-3 px-4">DR Grade & Severity</th>
                <th className="py-3 px-4">Delta / Change</th>
                <th className="py-3 px-4">Doctor Review</th>
                <th className="py-3 px-4">Triage Risk</th>
                <th className="py-3 px-4 text-right">View Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history?.screenings && history.screenings.length > 0 ? (
                history.screenings.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/screening/${s.id}/report`)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-800">
                      {s.screening_id}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{s.date}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold">{s.eye}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        s.dr_grade === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (s.dr_grade >= 2
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200')
                      }`}>
                        DR {s.dr_grade} • {s.dr_label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {s.change_status === 'WORSENED' && (
                        <span className="text-rose-700 font-bold inline-flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Worsened</span>
                        </span>
                      )}
                      {s.change_status === 'IMPROVED' && (
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Improved</span>
                        </span>
                      )}
                      {s.change_status === 'STABLE' && (
                        <span className="text-slate-600 font-medium inline-flex items-center gap-1">
                          <Minus className="w-3.5 h-3.5" />
                          <span>Stable</span>
                        </span>
                      )}
                      {!s.change_status && (
                        <span className="text-slate-400">Baseline</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-semibold text-slate-800">{s.doctor_decision}</span>
                      {s.doctor_final_grade !== undefined && s.doctor_final_grade !== null && (
                        <span className="text-slate-500 block text-[11px]">
                          Grade: DR {s.doctor_final_grade}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        s.triage_risk === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        s.triage_risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.triage_risk}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-teal-700 font-bold text-xs hover:underline">
                        Report →
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No screenings recorded for this patient yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Modal to choose Eye before starting new screening for this patient */}
      {showEyeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Start New Screening for {patient?.full_name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Patient ID: <span className="font-mono font-bold text-teal-800">{patient?.patient_id}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Select Eye to Examine:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEye('Right Eye')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-colors ${
                    selectedEye === 'Right Eye'
                      ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Right Eye (OD)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEye('Left Eye')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-colors ${
                    selectedEye === 'Left Eye'
                      ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Left Eye (OS)
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              Notice: This will associate the new screening directly with the existing patient record without creating a duplicate.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEyeModal(false)}
                disabled={isStartingScreening}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartScreening}
                disabled={isStartingScreening}
                className="btn-primary text-xs py-2 px-4 font-bold shadow-sm inline-flex items-center gap-1.5"
              >
                {isStartingScreening ? 'Initializing...' : 'Proceed to Fundus Image →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
