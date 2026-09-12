import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';
import { ReliabilityPanelData } from '../types';

interface Props {
  data: ReliabilityPanelData;
  drGrade?: number;
  dmeRisk?: string;
  isReferable?: boolean;
}

export const ReliabilityPanel: React.FC<Props> = ({ data, drGrade, dmeRisk, isReferable }) => {
  const isGood = data.overall_ai_status.includes('Suitable');
  const isLow = data.overall_ai_status.includes('Low');

  return (
    <div className="space-y-4">
      {/* 1. Screening Reliability Card */}
      <div className="card bg-gradient-to-br from-white to-slate-50/80 border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Screening Reliability & Integrity
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ISO/IEEE Clinical Safety Gate</span>
        </div>

        <div className="py-3 space-y-2.5 text-sm">
          {/* Quality check */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Image Optical Quality:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{data.image_quality_score}%</span>
              {data.image_quality_score >= 70 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </div>

          {/* AI Confidence */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">AI Classification Confidence:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{data.ai_confidence}%</span>
              {data.ai_confidence >= 80 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </div>

          {/* Lesion Evidence */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Lesion Corroboration (IDRiD):</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              data.lesion_evidence === 'Strong'
                ? 'bg-rose-100 text-rose-800'
                : (data.lesion_evidence === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
            }`}>
              {data.lesion_evidence} Evidence
            </span>
          </div>

          {/* Vessel Visibility */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Retinal Vessel Visibility (DRIVE):</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{data.vessel_visibility_score}%</span>
              {data.vessel_visibility_score >= 75 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between ${
          isGood
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : (isLow ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-amber-50/80 border-amber-200 text-amber-900')
        }`}>
          <div className="flex items-center gap-2">
            {isGood ? (
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">Overall AI Status</div>
              <div className="text-sm font-semibold">{data.overall_ai_status}</div>
            </div>
          </div>
          <div className="text-right text-xs font-medium text-slate-600 max-w-[200px]">
            {data.recommended_action}
          </div>
        </div>
      </div>

      {/* 2. "Why am I being referred?" Clinical Visual Explainer */}
      <div className="card bg-sky-50/50 border-sky-200">
        <div className="flex items-center gap-2 mb-2.5">
          <HelpCircle className="w-4 h-4 text-sky-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
            Why is Clinical Referral Recommended?
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap bg-white/80 p-2.5 rounded-lg border border-sky-100">
          <span className="font-semibold bg-slate-100 px-2 py-1 rounded">DR Grade {drGrade ?? 2}</span>
          <span className="text-slate-400">+</span>
          <span className="font-semibold bg-slate-100 px-2 py-1 rounded">{dmeRisk || 'DME Risk'}</span>
          <span className="text-slate-400">+</span>
          <span className="font-semibold bg-slate-100 px-2 py-1 rounded">{data.lesion_evidence} Lesions</span>
          <span className="text-slate-400">+</span>
          <span className="font-semibold bg-slate-100 px-2 py-1 rounded">{data.ai_confidence}% Conf</span>
          <ArrowRight className="w-4 h-4 text-sky-600 ml-1" />
          <span className={`font-bold px-2 py-1 rounded ${
            isReferable ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {isReferable ? 'Ophthalmologist Referral' : 'Annual Re-screening'}
          </span>
        </div>

        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {data.why_referred_rationale}
        </p>
      </div>
    </div>
  );
};
