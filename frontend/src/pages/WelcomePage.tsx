import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, HeartPulse, ShieldAlert, ArrowRight, UserPlus,
  Camera, CheckCircle2, Sparkles, Cpu, Search, Stethoscope, Compass, FileCheck
} from 'lucide-react';
import { DrishtiCareLogo } from '../components/DrishtiCareLogo';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const pipelineSteps = [
    { title: 'Patient Registration', desc: 'Demographics & diabetes history', icon: UserPlus },
    { title: 'Fundus Image Capture', desc: 'Portable camera or upload', icon: Camera },
    { title: 'Image Quality Gate', desc: 'Blur, glare, FoV verification', icon: CheckCircle2 },
    { title: 'CLAHE Preprocessing', desc: 'Contrast & illumination enhancement', icon: Sparkles },
    { title: 'AI Screening Analysis', desc: 'APTOS grading, IDRiD lesions, DRIVE vessels', icon: Cpu },
    { title: 'Explainability Attributions', desc: 'Grad-CAM heatmaps & evidence maps', icon: Search },
    { title: 'Doctor Adjudication', desc: 'Ophthalmologist review & override', icon: Stethoscope },
    { title: 'Risk-Based Triage', desc: 'Protocol-guided follow-up / referral', icon: Compass },
    { title: 'Screening Report', desc: 'Official clinical PDF printout', icon: FileCheck },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Hero Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider">
          <DrishtiCareLogo size={16} />
          <span>Clinical Decision Support System</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome to DrishtiCare
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
          An offline-first AI-assisted screening system designed to identify early signs of
          diabetic retinopathy and empower rural frontline healthcare workers with ophthalmologist review.
        </p>
      </div>

      {/* 3 Informational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: What is Diabetic Retinopathy? */}
        <div className="card hover:shadow-md transition-shadow border-teal-100 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              What is Diabetic Retinopathy?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Diabetic retinopathy (DR) is a microvascular retinal condition caused by prolonged high blood sugar
              damaging the delicate blood vessels in the retina. It often develops silently with no early symptoms
              until irreversible vision loss occurs.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-teal-800 font-semibold">
            Early detection prevents blindness in &gt;90% of cases.
          </div>
        </div>

        {/* Card 2: Why Screening Matters */}
        <div className="card hover:shadow-md transition-shadow border-teal-100 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Why Rural Screening Matters
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              India has over 77 million diabetic patients, yet less than 1 ophthalmologist per 100,000 citizens in rural areas.
              DrishtiCare bridges this gap by enabling frontline workers to triage at the point of care,
              distinguishing non-referable cases from urgent referable pathologies.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-amber-800 font-semibold">
            Saves travel costs and tertiary hospital backlogs.
          </div>
        </div>

        {/* Card 3: Clinical Governance */}
        <div className="card hover:shadow-md transition-shadow border-teal-100 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              AI Assists. Human Decides.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              The AI model never makes autonomous medical diagnoses. It acts as an explainable decision-support
              engine providing lesion maps, vessel graphs, and Grad-CAM activations for clinical validation
              by a remote or district ophthalmologist.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-sky-800 font-semibold">
            Complete traceability with clinical audit trails.
          </div>
        </div>
      </div>

      {/* Visual Pipeline Section */}
      <div className="card bg-gradient-to-b from-white to-slate-50 border-slate-200">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">
            How the End-to-End Edge Workflow Operates
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Seamless rural screening workflow from patient registration to referral
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center text-center shadow-2xs relative"
              >
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {step.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Button */}
      <div className="text-center pt-2">
        <button
          onClick={() => navigate('/patient/new')}
          className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-teal-600/30 inline-flex items-center gap-3 group"
        >
          <span className="font-bold">START SCREENING WORKFLOW</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
