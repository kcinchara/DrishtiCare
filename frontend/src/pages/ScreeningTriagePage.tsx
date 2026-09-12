import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight,
  FileCheck, Calendar, Clock, MapPin, Stethoscope, ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { ScreeningDetail } from '../types';

export const ScreeningTriagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [followUpMonths, setFollowUpMonths] = useState<number>(3);
  const [referralReason, setReferralReason] = useState<string>('Moderate diabetic retinopathy with macular exudates.');
  const [destination, setDestination] = useState<string>('ABC Eye Hospital');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      api.getScreeningDetail(id).then((data) => {
        setScreening(data);
        const grade = data?.doctor_review?.final_grade ?? data?.ai_result?.dr_grade ?? 2;
        const hasDme = data?.ai_result?.dme_risk?.includes('Possible');

        if (grade >= 3 || (grade >= 2 && hasDme)) {
          setSelectedRisk('HIGH');
          setFollowUpMonths(1);
          setReferralReason(`High Risk: Grade ${grade} with ${hasDme ? 'DME suspicion' : 'significant microvascular lesions'}.`);
        } else if (grade === 2) {
          setSelectedRisk('MEDIUM');
          setFollowUpMonths(3);
          setReferralReason('Medium Risk: Moderate DR warranting ophthalmologist secondary evaluation.');
        } else {
          setSelectedRisk('LOW');
          setFollowUpMonths(12);
          setReferralReason('Low Risk: No referable diabetic retinopathy. Routine annual screening advised.');
        }
      });
    }
  }, [id]);

  const handleTriageAction = async (actionType: 'referral' | 'followup') => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      // 1. Save Triage Decision
      await api.performTriage({
        screening_id: parseInt(id, 10),
        risk_category: selectedRisk,
        follow_up_months: followUpMonths,
        referral_recommended: actionType === 'referral' || selectedRisk === 'HIGH',
        referral_reason: referralReason,
        priority: selectedRisk === 'HIGH' ? 'URGENT' : 'ROUTINE'
      });

      if (actionType === 'referral' || selectedRisk === 'HIGH') {
        // Auto-create referral record with full hospital metadata
        await api.generateReferral({
          screening_id: parseInt(id, 10),
          patient_id: screening?.patient?.id || 1,
          dr_grade: screening?.doctor_review?.final_grade ?? screening?.ai_result?.dr_grade ?? 2,
          dme_risk: screening?.ai_result?.dme_risk || 'Low',
          reason: referralReason,
          priority: selectedRisk === 'HIGH' ? 'URGENT' : 'ROUTINE',
          recommended_destination: destination,
          hospital_name: destination,
          hospital_address: destination.includes('District')
            ? 'Irwin Road, Lashkar Mohalla, Mysuru, Karnataka 570001'
            : 'Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru, Karnataka 570020',
          hospital_contact: destination.includes('District') ? '+91 821 252 0150' : '+91 821 241 9300',
          hospital_distance: destination.includes('District') ? '4.1 km away' : '2.4 km away',
          directions_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination + ' Mysuru')}`
        });
      }

      // 2. Generate PDF Report immediately
      await api.generateReport(id);

      // 3. Move to Step 8: Official Screening Report
      navigate(`/screening/${id}/report`);
    } catch (err: any) {
      console.warn('Triage submission notice:', err.message);
      navigate(`/screening/${id}/report`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ScreeningStepper currentStep={7} screeningId={id} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-600" />
                <span>Screening Risk Triage & Clinical Pathways</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Step 7 of 8 — Rule-based clinical triage with configurable follow-up horizons
              </p>
            </div>
            <div className="badge-info text-xs font-mono">
              Clinical Protocol v2.4
            </div>
          </div>

          {/* 3 Risk Classification Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {/* LOW RISK */}
            <div
              onClick={() => {
                setSelectedRisk('LOW');
                setFollowUpMonths(12);
                setReferralReason('No referable DR detected. Annual re-screening recommended.');
              }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedRisk === 'LOW'
                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  LOW RISK
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900">Grade 0 – 1</div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                No referable diabetic retinopathy detected. Strict blood glucose monitoring.
              </p>
              <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs font-bold text-emerald-900">
                Suggested Next Screening: 12 Months
              </div>
            </div>

            {/* MEDIUM / REVIEW */}
            <div
              onClick={() => {
                setSelectedRisk('MEDIUM');
                setFollowUpMonths(3);
                setReferralReason('Moderate DR requiring non-emergency clinical review within 3 months.');
              }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedRisk === 'MEDIUM'
                  ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  MEDIUM RISK / REVIEW
                </span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900">Grade 1 – 2</div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Early microvascular changes observed. Ophthalmologist review recommended.
              </p>
              <div className="mt-4 pt-3 border-t border-amber-200/60 text-xs font-bold text-amber-900">
                Suggested Next Screening: 3–6 Months
              </div>
            </div>

            {/* HIGH RISK / REFERRAL */}
            <div
              onClick={() => {
                setSelectedRisk('HIGH');
                setFollowUpMonths(1);
                setReferralReason('Urgent ophthalmologist referral for comprehensive dilated fundus examination.');
              }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedRisk === 'HIGH'
                  ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  HIGH RISK / REFERRAL
                </span>
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900">Grade 2 – 4 / DME</div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Vision-threatening diabetic retinopathy or potential macular edema detected.
              </p>
              <div className="mt-4 pt-3 border-t border-rose-200/60 text-xs font-bold text-rose-900">
                Action: Urgent Tertiary Referral
              </div>
            </div>
          </div>

          {/* Triage Customization Form */}
          <div className="mt-8 space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Triage Disposition Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up Interval (Months)
                </label>
                <select
                  value={followUpMonths}
                  onChange={(e) => setFollowUpMonths(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value={1}>1 Month (Urgent evaluation)</option>
                  <option value={3}>3 Months (Quarterly review)</option>
                  <option value={6}>6 Months (Semi-annual check)</option>
                  <option value={12}>12 Months (Routine annual screening)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Designated Referral Destination
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. ABC Eye Hospital"
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Rationale for Triage Decision
                </label>
                <textarea
                  rows={2}
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/screening/${id}/review`)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Review</span>
            </button>

            <div className="flex items-center gap-3">
              {selectedRisk !== 'HIGH' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleTriageAction('followup')}
                  className="btn-secondary text-xs py-2.5 px-4 font-bold"
                >
                  Mark Follow-up Schedule
                </button>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTriageAction('referral')}
                className="btn-primary py-2.5 px-6 font-bold text-xs shadow-md inline-flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>{selectedRisk === 'HIGH' ? 'GENERATE REFERRAL & REPORT' : 'FINALIZE REPORT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
