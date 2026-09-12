import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Sparkles } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface Props {
  textToSpeak?: string;
  drGrade?: number | string;
  drLabel?: string;
  isReferable?: boolean;
  dmeRisk?: string;
}

export const AudioAssistant: React.FC<Props> = ({
  textToSpeak,
  drGrade,
  drLabel = 'Moderate Diabetic Retinopathy',
  isReferable = true,
  dmeRisk = 'Low'
}) => {
  const { currentLanguage, t } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getLocalizedSummary = (): string => {
    if (textToSpeak) return textToSpeak;

    switch (currentLanguage) {
      case 'hi':
        return `रेटिनल स्क्रीनिंग परिणाम। आपकी आंख की जांच में ${drLabel} पाया गया है। ${
          isReferable
            ? 'आपकी स्थिति को नेत्र रोग विशेषज्ञ से जांच कराने की तत्काल सलाह दी जाती है।'
            : 'आपकी स्थिति सामान्य है, 12 महीने में दोबारा जांच कराएं।'
        } नियमित रक्त शर्करा नियंत्रण आवश्यक है।`;
      case 'kn':
        return `ರೆಟಿನಾ ತಪಾಸಣೆ ಫಲಿತಾಂಶ. ನಿಮ್ಮ ಕಣ್ಣಿನ ಪರೀಕ್ಷೆಯಲ್ಲಿ ${drLabel} ಕಂಡುಬಂದಿದೆ. ${
          isReferable
            ? 'ಜಿಲ್ಲಾ ನೇತ್ರ ವೈದ್ಯರಿಂದ ಹೆಚ್ಚಿನ ಚಿಕಿತ್ಸೆ ಮತ್ತು ತಪಾಸಣೆ ಪಡೆಯಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.'
            : 'ನಿಮ್ಮ ಕಣ್ಣುಗಳು ಸ್ಥಿರವಾಗಿವೆ, 12 ತಿಂಗಳಲ್ಲಿ ವಾಡಿಕೆಯ ತಪಾಸಣೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ.'
        } ರಕ್ತದಲ್ಲಿನ ಸಕ್ಕರೆ ಮಟ್ಟವನ್ನು ನಿಯಂತ್ರಣದಲ್ಲಿಡಿ.`;
      case 'ta':
        return `விழித்திரை பரிசோதனை முடிவு. உங்கள் பரிசோதனையில் ${drLabel} கண்டறியப்பட்டுள்ளது. ${
          isReferable
            ? 'கண் மருத்துவரை அணுகி உடனடி ஆலோசனை பெறுவது அவசியம்.'
            : 'நிலைமை சீராக உள்ளது, 12 மாதங்களில் மீண்டும் பரிசோதிக்கவும்.'
        }`;
      case 'te':
        return `రెటీనా పరీక్ష ఫలితాలు. మీ కంటి పరీక్షలో ${drLabel} గుర్తించబడింది. ${
          isReferable
            ? 'వెంటనే నేత్ర వైద్య నిపుణుడిని సంప్రదించి చికిత్స పొందండి.'
            : 'పరిస్థితి నిలకడగా ఉంది, 12 నెలల్లో తిరిగి పరీక్షించుకోండి.'
        }`;
      case 'mr':
        return `रेटिना तपासणी निकाल. आपल्या डोळ्यांच्या तपासणीत ${drLabel} आढळले आहे. ${
          isReferable
            ? 'नेत्रतज्ज्ञांकडून त्वरित तपासणी करून घेण्याचा सल्ला देण्यात आला आहे.'
            : 'आपली स्थिती सामान्य आहे, १२ महिन्यांनी पुन्हा तपासणी करा.'
        }`;
      default:
        return `Retinal screening result. Your eye examination shows ${drLabel} with ${dmeRisk} Macular Edema risk. ${
          isReferable
            ? 'Clinical protocol recommends referral to a district ophthalmologist for specialist review and treatment.'
            : 'Routine screening complete. Annual re-screening recommended in 12 months.'
        } Please keep your blood glucose and blood pressure well controlled.`;
    }
  };

  const getLanguageCodeForSpeech = (lang: string): string => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'kn': return 'kn-IN';
      case 'ta': return 'ta-IN';
      case 'te': return 'te-IN';
      case 'mr': return 'mr-IN';
      default: return 'en-IN';
    }
  };

  const toggleSpeech = () => {
    if (!speechSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const message = getLocalizedSummary();
    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = getLanguageCodeForSpeech(currentLanguage);
    utterance.rate = 0.95; // Clear natural tempo for rural patients
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!speechSupported) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleSpeech}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isSpeaking
            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md animate-pulse'
            : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs'
        }`}
        title="Listen to Voice Diagnosis"
      >
        {isSpeaking ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{t('result.speaking', 'Stop Voice Readout')}</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-teal-600" />
            <span>{t('result.audioAssistant', 'Listen Aloud (Voice Guidance)')}</span>
          </>
        )}
      </button>

      {isSpeaking && (
        <div className="flex items-center gap-0.5">
          <span className="w-1 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-4 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};
