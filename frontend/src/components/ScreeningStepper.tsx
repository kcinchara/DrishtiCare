import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Activity } from 'lucide-react';
import { sound } from '../utils/audio';
import { useLanguage } from '../utils/i18n';

interface Step {
  id: number;
  labelKey: string;
  defaultLabel: string;
  desc: string;
  routeSuffix: string;
}

const STEP_DEFS: Step[] = [
  { id: 1, labelKey: 'step.patient', defaultLabel: 'Patient', desc: 'Demographics & diabetes profile', routeSuffix: 'patient' },
  { id: 2, labelKey: 'step.image', defaultLabel: 'Image', desc: 'Retinal fundus capture & upload', routeSuffix: 'image' },
  { id: 3, labelKey: 'step.quality', defaultLabel: 'Quality Gate', desc: 'OpenCV optical quality verification', routeSuffix: 'quality' },
  { id: 4, labelKey: 'step.enhance', defaultLabel: 'Enhancement', desc: 'CLAHE adaptive histogram equalization', routeSuffix: 'enhancement' },
  { id: 5, labelKey: 'step.analysis', defaultLabel: 'AI Analysis', desc: 'APTOS grading, IDRiD lesions, DRIVE vessels', routeSuffix: 'analysis' },
  { id: 6, labelKey: 'step.review', defaultLabel: 'Doctor Review', desc: 'Ophthalmologist adjudication & override', routeSuffix: 'review' },
  { id: 7, labelKey: 'step.triage', defaultLabel: 'Risk Triage', desc: 'Risk classification & referral scheduling', routeSuffix: 'triage' },
  { id: 8, labelKey: 'step.report', defaultLabel: 'Clinical Report', desc: 'Official printable clinical report', routeSuffix: 'report' },
];

interface Props {
  currentStep: number;
  screeningId?: string | number;
}

export const ScreeningStepper: React.FC<Props> = ({ currentStep, screeningId }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = STEP_DEFS.map((s) => ({
    ...s,
    label: t(s.labelKey, s.defaultLabel)
  }));

  const handleStepClick = (stepId: number, suffix: string) => {
    // Only allow navigating backward or to steps that have already been achieved
    if (stepId < currentStep && screeningId) {
      sound.playClick();
      if (suffix === 'patient') {
        navigate(`/patient/new?screening_id=${screeningId}`);
      } else {
        navigate(`/screening/${screeningId}/${suffix}`);
      }
    }
  };

  const progressPct = Math.round((currentStep / steps.length) * 100);
  const activeStep = steps[currentStep - 1] || steps[0];
  const prevStep = currentStep > 1 ? steps[currentStep - 2] : null;

  return (
    <div className="w-full bg-white border-b border-slate-200 py-3 px-3 sm:px-6 lg:px-8 mb-5 shadow-xs transition-colors duration-200">
      {/* Top summary row (Desktop & Mobile) */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
          <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs text-slate-700">
            Screening Progress
          </span>
          <span className="text-slate-400">•</span>
          <span className="font-semibold text-teal-800 text-[11px] sm:text-xs truncate">
            Step {currentStep}/8: {activeStep?.label}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono shrink-0">
          <span className="text-slate-500 text-[10px] sm:text-[11px]">{progressPct}%</span>
          <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Stepper View (< md) */}
      <div className="md:hidden mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {prevStep && screeningId ? (
          <button
            type="button"
            onClick={() => handleStepClick(prevStep.id, prevStep.routeSuffix)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <span>← Step {prevStep.id}</span>
            <span className="text-slate-400 font-normal">({prevStep.label})</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Initial Step</span>
        )}

        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isCompleted && !isCurrent}
                onClick={() => handleStepClick(step.id, step.routeSuffix)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCompleted
                    ? 'bg-teal-600 text-white cursor-pointer hover:scale-110'
                    : isCurrent
                    ? 'bg-teal-600 text-white ring-2 ring-teal-200 shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={`Step ${step.id}: ${step.label}`}
              >
                {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper View (>= md) */}
      <div className="hidden md:flex max-w-6xl mx-auto items-center justify-between mt-3 min-w-[700px] overflow-x-auto">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label with Hover Tooltip */}
              <div
                onClick={() => handleStepClick(step.id, step.routeSuffix)}
                className={`relative flex flex-col items-center gap-1.5 group ${
                  isCompleted ? 'cursor-pointer' : (isCurrent ? 'cursor-default' : 'cursor-not-allowed opacity-50')
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/30 group-hover:scale-110'
                      : isCurrent
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100 shadow-md scale-110 animate-pulse'
                      : 'bg-slate-100 text-slate-500 border border-slate-300'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
                </div>
                <span
                  className={`text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-teal-900 font-bold'
                      : isCompleted
                      ? 'text-slate-700 group-hover:text-teal-700'
                      : 'text-slate-400'
                  }`}
                >
                  Step {step.id}: {step.label}
                </span>

                {/* Hover Tooltip */}
                <div className="absolute top-12 scale-0 group-hover:scale-100 transition-all duration-150 z-30 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1 whitespace-nowrap shadow-xl pointer-events-none">
                  {step.desc}
                </div>
              </div>

              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                    step.id < currentStep ? 'bg-teal-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
