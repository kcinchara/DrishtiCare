import React, { useState } from 'react';
import {
  X, Eye, Heart, Activity, AlertTriangle, CheckCircle2,
  AlertOctagon, Hospital, Navigation, Globe, ShieldAlert
} from 'lucide-react';
import { sound } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  drGrade: number;
  onFindHospital?: () => void;
}

export const ExplainToPatientModal: React.FC<Props> = ({
  isOpen,
  onClose,
  drGrade,
  onFindHospital
}) => {
  const [lang, setLang] = useState<'en' | 'kn'>('en');

  if (!isOpen) return null;

  // Multilingual content in English and Kannada
  const content = {
    en: {
      modalTitle: 'Patient Explanation Mode',
      subtitle: 'Simplified, jargon-free summary designed for patient communication',
      screeningTitle: 'Your Eye Screening Result',
      drGradeLabel: `DR Grade ${drGrade}`,
      gradeTitle: [
        'Normal Retinal Health (No Retinopathy)',
        'Mild Retinal Changes Detected',
        'Moderate Retinal Changes Detected',
        'Severe Retinal Changes Detected',
        'Advanced Retinal Changes Detected'
      ][drGrade] || 'Moderate Retinal Changes',
      whatMeansTitle: 'What does this mean for your vision?',
      whatMeansText: [
        'No signs of diabetes-related damage were detected in your retina. Your eyes currently look healthy.',
        'Very early microvascular changes were observed in your retina. These need routine monitoring so they do not progress.',
        'Visible changes caused by diabetes were detected in your retina. An eye specialist (ophthalmologist) should examine your eyes.',
        'Significant diabetic changes were detected in the blood vessels of your retina. A specialist must evaluate your eyes promptly.',
        'High-risk diabetic retinal changes were detected. You require urgent evaluation and care at an eye hospital.'
      ][drGrade] || 'Retinal changes were detected.',
      whatToDoTitle: 'What should you do next?',
      whatToDoText: [
        'Continue regular diabetes management with your doctor and schedule your next eye screening in 12 months.',
        'Schedule a routine eye check-up in 6 to 12 months and maintain steady blood sugar control.',
        'Visit an eye specialist / eye hospital within 2 to 4 weeks for a dilated eye examination.',
        'Visit an eye specialist promptly (within 1 to 2 weeks) for detailed evaluation and treatment planning.',
        'Visit a specialized eye hospital immediately for urgent retina consultation and vision protection.'
      ][drGrade] || 'Please consult an eye specialist.',
      homeCareTitle: '🏠 Healthy Habits & Home Care',
      homeCareSubtitle: 'Daily steps to support your general health and protect your vision:',
      habits: [
        'Take your prescribed diabetes medicines on time every day.',
        'Check your blood glucose regularly as advised by your healthcare worker.',
        'Eat a balanced diet with vegetables, whole grains, and controlled portions.',
        'Stay physically active through daily walking or light exercise.',
        'Avoid smoking, bidi, or tobacco products.',
        'Attend all scheduled eye doctor appointments.',
        'Do not stop or change medicines without your doctor’s advice.'
      ],
      disclaimer: 'Note: Healthy habits support overall diabetes control, but they cannot cure or reverse eye damage. Always follow your eye specialist’s instructions.',
      findHospitalBtn: 'Find Nearby Eye Hospital',
      closeBtn: 'Close Explanation'
    },
    kn: {
      modalTitle: 'ರೋಗಿ ವಿವರಣೆ ಮೋಡ್ (Patient Explanation)',
      subtitle: 'ರೋಗಿಗಳಿಗೆ ಸುಲಭವಾಗಿ ಅರ್ಥವಾಗುವ ಸರಳ ಭಾಷೆಯ ಸಾರಾಂಶ',
      screeningTitle: 'ನಿಮ್ಮ ಕಣ್ಣಿನ ತಪಾಸಣೆಯ ಫಲಿತಾಂಶ',
      drGradeLabel: `ಡಿಆರ್ ಗ್ರೇಡ್ ${drGrade}`,
      gradeTitle: [
        'ಸಾಮಾನ್ಯ ಕಣ್ಣಿನ ಆರೋಗ್ಯ (ಯಾವುದೇ ಹಾನಿ ಇಲ್ಲ)',
        'ಸೌಮ್ಯ ಹಂತದ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ',
        'ಮಧ್ಯಮ ಹಂತದ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ',
        'ತೀವ್ರ ಹಂತದ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ',
        'ಮುಂದುವರಿದ ಹಂತದ ಗಂಭೀರ ಬದಲಾವಣೆಗಳು'
      ][drGrade] || 'ಕಣ್ಣಿನಲ್ಲಿ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ',
      whatMeansTitle: 'ನಿಮ್ಮ ದೃಷ್ಟಿಗೆ ಇದರ ಅರ್ಥವೇನು?',
      whatMeansText: [
        'ನಿಮ್ಮ ಕಣ್ಣಿನ ರೆಟಿನಾದಲ್ಲಿ ಮಧುಮೇಹದ ಯಾವುದೇ ಹಾನಿಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ನಿಮ್ಮ ಕಣ್ಣುಗಳು ಆರೋಗ್ಯವಾಗಿವೆ.',
        'ನಿಮ್ಮ ಕಣ್ಣಿನ ರೆಟಿನಾದಲ್ಲಿ ಸೌಮ್ಯ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ. ಇವು ಹೆಚ್ಚಾಗದಂತೆ ನಿಯಮಿತವಾಗಿ ತಪಾಸಣೆ ಮಾಡಿಸಬೇಕು.',
        'ಮಧುಮೇಹದಿಂದ ಉಂಟಾದ ಬದಲಾವಣೆಗಳು ಕಣ್ಣಿನಲ್ಲಿ ಕಂಡುಬಂದಿವೆ. ನೇತ್ರ ತಜ್ಞ ವೈದ್ಯರು (ಕಣ್ಣಿನ ಡಾಕ್ಟರ್) ನಿಮ್ಮ ಕಣ್ಣುಗಳನ್ನು ಪರೀಕ್ಷಿಸಬೇಕು.',
        'ನಿಮ್ಮ ಕಣ್ಣಿನ ರಕ್ತನಾಳಗಳಲ್ಲಿ ಗಮನಾರ್ಹ ಮಧುಮೇಹದ ಹಾನಿ ಕಂಡುಬಂದಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ನೇತ್ರ ತಜ್ಞರನ್ನು ಭೇಟಿ ಮಾಡುವುದು ಅವಶ್ಯಕ.',
        'ಕಣ್ಣಿನಲ್ಲಿ ಗಂಭೀರ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ. ದೃಷ್ಟಿ ರಕ್ಷಣೆಗಾಗಿ ತಕ್ಷಣವೇ ಕಣ್ಣಿನ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ ಚಿಕಿತ್ಸೆ ಪಡೆಯಬೇಕು.'
      ][drGrade] || 'ಕಣ್ಣಿನಲ್ಲಿ ಬದಲಾವಣೆಗಳು ಕಂಡುಬಂದಿವೆ.',
      whatToDoTitle: 'ನೀವು ಈಗ ಏನು ಮಾಡಬೇಕು?',
      whatToDoText: [
        'ನಿಮ್ಮ ಸಕ್ಕರೆ ಕಾಯಿಲೆಯ ಮಾತ್ರೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಸೇವಿಸಿ ಮತ್ತು 1 ವರ್ಷದ ನಂತರ ಮತ್ತೊಮ್ಮೆ ಕಣ್ಣಿನ ತಪಾಸಣೆ ಮಾಡಿಸಿ.',
        'ಮುಂದಿನ 6 ರಿಂದ 12 ತಿಂಗಳಲ್ಲಿ ಕಣ್ಣಿನ ತಪಾಸಣೆ ಮಾಡಿಸಿ ಮತ್ತು ರಕ್ತದಲ್ಲಿ ಸಕ್ಕರೆ ಮಟ್ಟವನ್ನು ನಿಯಂತ್ರಣದಲ್ಲಿಡಿ.',
        'ಮುಂದಿನ 2 ರಿಂದ 4 ವಾರಗಳಲ್ಲಿ ಕಣ್ಣಿನ ತಜ್ಞರನ್ನು (ಆಸ್ಪತ್ರೆ) ಭೇಟಿ ಮಾಡಿ ಸಂಪೂರ್ಣ ಕಣ್ಣಿನ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ.',
        'ಮುಂದಿನ 1 ರಿಂದ 2 ವಾರಗಳಲ್ಲಿ ಕಣ್ಣಿನ ಆಸ್ಪತ್ರೆಗೆ ತೆರಳಿ ತಜ್ಞರಿಂದ ಸೂಕ್ತ ಸಲಹೆ ಮತ್ತು ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.',
        'ತಕ್ಷಣವೇ ನೇತ್ರ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ ತುರ್ತು ತಪಾಸಣೆ ಮತ್ತು ಚಿಕಿತ್ಸೆ ಪಡೆದುಕೊಳ್ಳಿ.'
      ][drGrade] || 'ದಯವಿಟ್ಟು ನೇತ್ರ ತಜ್ಞರನ್ನು ಭೇಟಿ ಮಾಡಿ.',
      homeCareTitle: '🏠 ಮನೆಯಲ್ಲಿ ಅನುಸರಿಸಬೇಕಾದ ಆರೋಗ್ಯಕರ ಅಭ್ಯಾಸಗಳು',
      homeCareSubtitle: 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಮತ್ತು ದೃಷ್ಟಿ ರಕ್ಷಿಸಲು ದಿನನಿತ್ಯದ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು:',
      habits: [
        'ವೈದ್ಯರು ಸೂಚಿಸಿದ ಸಕ್ಕರೆ ಕಾಯಿಲೆಯ ಮಾತ್ರೆಗಳನ್ನು ಪ್ರತಿದಿನ ತಪ್ಪದೇ ಸೇವಿಸಿ.',
        'ನಿಮ್ಮ ರಕ್ತದ ಸಕ್ಕರೆ (ಶುಗರ್) ಮಟ್ಟವನ್ನು ನಿಯಮಿತವಾಗಿ ಪರೀಕ್ಷಿಸಿಕೊಳ್ಳಿ.',
        'ತರಕಾರಿಗಳು, ಸೊಪ್ಪು ಮತ್ತು ಕಾಳುಗಳಿರುವ ಪೌಷ್ಟಿಕ ಆಹಾರವನ್ನು ಸೇವಿಸಿ.',
        'ಪ್ರತಿದಿನ ವಾಕಿಂಗ್ ಅಥವಾ ಲಘು ವ್ಯಾಯಾಮ ಮಾಡುವ ಮೂಲಕ ಕ್ರಿಯಾಶೀಲವಾಗಿರಿ.',
        'ಧೂಮಪಾನ ಮತ್ತು ತಂಬಾಕು ಸೇವನೆಯನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತ್ಯಜಿಸಿ.',
        'ತಿಳಿಸಿದ ದಿನಾಂಕದಂದು ಕಣ್ಣಿನ ತಪಾಸಣೆಗೆ ತಪ್ಪದೇ ಹಾಜರಾಗಿ.',
        'ವೈದ್ಯರ ಸಲಹೆಯಿಲ್ಲದೆ ಯಾವುದೇ ಕಾರಣಕ್ಕೂ ಮಾತ್ರೆಗಳನ್ನು ನಿಲ್ಲಿಸಬೇಡಿ.'
      ],
      disclaimer: 'ಗಮನಿಸಿ: ಆರೋಗ್ಯಕರ ಆಹಾರ ಮತ್ತು ಅಭ್ಯಾಸಗಳು ಶುಗರ್ ನಿಯಂತ್ರಣಕ್ಕೆ ಸಹಕಾರಿ, ಆದರೆ ಇವು ಕಣ್ಣಿನ ಹಾನಿಯನ್ನು ವಾಸಿ ಮಾಡುವುದಿಲ್ಲ. ವೈದ್ಯರ ಸಲಹೆಯನ್ನು ಪಾಲಿಸಿ.',
      findHospitalBtn: 'ಹತ್ತಿರದ ಕಣ್ಣಿನ ಆಸ್ಪತ್ರೆ ಹುಡುಕಿ',
      closeBtn: 'ವಿವರಣೆ ಮುಚ್ಚಿ'
    }
  };

  const tData = content[lang];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Controls: Title, Language Switcher, Close */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase text-teal-700 tracking-wider">
              {tData.modalTitle}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{tData.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector: English vs Kannada */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => { sound.playClick(); setLang('en'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'en' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => { sound.playClick(); setLang('kn'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'kn' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ಕನ್ನಡ (Kannada)
              </button>
            </div>

            <button
              onClick={() => { sound.playClick(); onClose(); }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screening Result Banner - Extra Large Typography */}
        <div className={`p-6 rounded-3xl border text-center space-y-2 ${
          drGrade === 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : (drGrade >= 3 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-amber-50 border-amber-200 text-amber-950')
        }`}>
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            {tData.screeningTitle}
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            {tData.drGradeLabel}
          </div>
          <div className="text-base sm:text-lg font-bold">
            {tData.gradeTitle}
          </div>
        </div>

        {/* Simple Explanation 1: What does this mean? */}
        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-600" />
            <span>{tData.whatMeansTitle}</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {tData.whatMeansText}
          </p>
        </div>

        {/* Simple Explanation 2: What should you do? */}
        <div className={`space-y-1.5 p-4 rounded-2xl border ${
          drGrade >= 2
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-teal-50/60 border-teal-200 text-teal-950'
        }`}>
          <h3 className="text-sm font-black flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>{tData.whatToDoTitle}</span>
          </h3>
          <p className="text-sm font-semibold leading-relaxed">
            {tData.whatToDoText}
          </p>
        </div>

        {/* Simple Explanation 3: Home Care & Healthy Habits */}
        <div className="space-y-3 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>{tData.homeCareTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{tData.homeCareSubtitle}</p>
          </div>

          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
            {tData.habits.map((h, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
            ℹ️ {tData.disclaimer}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {drGrade >= 2 ? (
            <button
              onClick={() => {
                sound.playClick();
                onClose();
                if (onFindHospital) onFindHospital();
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Hospital className="w-4 h-4" />
              <span>{tData.findHospitalBtn}</span>
            </button>
          ) : <div />}

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all text-center"
          >
            {tData.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
