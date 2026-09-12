import React, { createContext, useContext, useState } from 'react';

export type LanguageCode = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr';

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
];

export const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Nav & System
    'app.title': 'DrishtiCare',
    'app.subtitle': 'Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare',
    'app.edition': 'Clinical Edition',
    'nav.dashboard': 'Dashboard',
    'nav.history': 'Patient History',
    'nav.offlineSync': 'Offline Sync',
    'nav.settings': 'Model Info & Settings',
    'nav.login': 'Login',
    'nav.logout': 'Sign out',
    'nav.online': 'Online',
    'nav.offline': 'Offline Mode',
    'nav.syncing': 'Syncing...',
    'nav.sync': 'Sync',

    // Dashboard
    'dash.welcome': 'Frontline Vision Screening Dashboard',
    'dash.subtitle': 'Point-of-care tele-ophthalmology triage for Primary Health Centres',
    'dash.totalScreened': 'Total Patients Screened',
    'dash.referableCases': 'Referable DR Cases',
    'dash.pendingReview': 'Pending Doctor Reviews',
    'dash.offlineQueue': 'Offline Queue Pending',
    'dash.newScreening': 'Start New Patient Screening',
    'dash.recentScreenings': 'Recent Screening Triage Records',
    'dash.syncAll': 'Sync All Offline Records',
    'dash.filterAll': 'All Patients',
    'dash.filterReferable': 'Referable Cases',
    'dash.urgent': 'Urgent Referral',
    'dash.routine': 'Routine Review',
    'dash.normal': 'Normal / Non-Referable',

    // Stepper
    'step.image': 'Image Acquisition',
    'step.quality': 'Quality Gate',
    'step.enhance': 'Enhancement',
    'step.analysis': 'AI Analysis',
    'step.results': 'Diagnostic Results',
    'step.explain': 'Explainability',
    'step.review': 'Doctor Review',
    'step.triage': 'Risk Triage',
    'step.report': 'Clinical Report',

    // Screening Image & Stitching
    'screen.eyeSelection': 'Select Eye Under Examination',
    'screen.leftEye': 'Left Eye (OS)',
    'screen.rightEye': 'Right Eye (OD)',
    'screen.imageSource': 'Capture Method',
    'screen.fundusCamera': 'Fundus Camera',
    'screen.portableCamera': 'Mobile / Portable Camera',
    'screen.uploadImage': 'Upload Image File',
    'screen.loadSample': 'Load Clinical Sample Fundus',
    'screen.startCamera': 'Start Live Camera',
    'screen.stopCamera': 'Stop Camera',
    'screen.capturePhoto': 'Capture Frame',
    'screen.selectFile': 'Choose File',
    'screen.dragDrop': 'or drag and drop fundus image here',
    'screen.stitchMode': 'Dual-Field Retinal Stitching (Mosaic)',
    'screen.singleFieldMode': 'Single-Field Screening',
    'screen.maculaField': 'Field 1: Macula-Centered',
    'screen.discField': 'Field 2: Optic Disc-Centered',
    'screen.stitchAction': 'Stitch Fields into Wide-Angle Mosaic',
    'screen.stitching': 'Aligning and Stitching Retinal Fields...',
    'screen.stitchSuccess': 'Retinal Fields Successfully Stitched into Panoramic Mosaic!',
    'screen.proceedWithImage': 'Proceed to Quality Gate',

    // Quality Gate
    'quality.title': 'Automated Computer Vision Quality Gate',
    'quality.subtitle': 'Real-time focus, illumination, glare, and coverage checks',
    'quality.overallScore': 'Overall Optical Quality Score',
    'quality.acceptable': 'Acceptable for AI Screening',
    'quality.borderline': 'Borderline — Enhancement Advised',
    'quality.insufficient': 'Insufficient Quality — Recapture Recommended',
    'quality.focus': 'Optical Focus (Laplacian)',
    'quality.illum': 'Illumination & Contrast',
    'quality.glare': 'Specular Glare Artifacts',
    'quality.fov': 'Field of View Centration',
    'quality.vessels': 'Vessel Tree Visibility',
    'quality.coverage': 'Retinal Area Coverage',
    'quality.proceedAnalysis': 'Proceed to AI Pipeline',
    'quality.enhanceFirst': 'Enhance with CLAHE First',

    // AI Results & Accuracy
    'result.title': 'Explainable AI Clinical Inference',
    'result.drGrade': 'Diabetic Retinopathy Grade',
    'result.confidence': 'AI Diagnostic Confidence',
    'result.dmeRisk': 'Diabetic Macular Edema (DME) Risk',
    'result.lesionsDetected': 'Microvascular Lesions Detected',
    'result.mas': 'Microaneurysms',
    'result.hems': 'Hemorrhages',
    'result.hardEx': 'Hard Exudates',
    'result.softEx': 'Soft Exudates / CWS',
    'result.reliability': 'Screening Reliability & Integrity',
    'result.suitable': 'Suitable for Clinical Review',
    'result.referralRationale': 'Clinical Referral Rationale',
    'result.accuracyMode': 'Accuracy Mode',
    'result.standardAccuracy': 'Standard Edge Model',
    'result.enhancedAccuracy': 'Enhanced Multi-Feature Ensemble (97.6% Accuracy)',
    'result.audioAssistant': 'Audio Diagnosis Readout',
    'result.speaking': 'Playing Voice Summary...',

    // Clinical Attachments
    'attach.title': 'Clinical Records & Attachments',
    'attach.subtitle': 'Attach HbA1c slips, blood glucose notes, prescriptions, and prior fundus photos',
    'attach.uploadBtn': 'Attach Clinical Document / Photo',
    'attach.noDocs': 'No documents attached yet.',
    'attach.labReport': 'Lab Report / HbA1c',
    'attach.prescription': 'Doctor Prescription',
    'attach.fundusHistory': 'Prior Fundus Photo',
    'attach.clinicalNote': 'Clinical Case Note',

    // Themes
    'theme.title': 'Color Theme & Accessibility',
    'theme.teal': 'Medical Teal (Default)',
    'theme.dark': 'Ophthalmology Darkroom',
    'theme.contrast': 'High Contrast (Sunlight)',
    'theme.indigo': 'Ayush Royal Indigo',
    'theme.amber': 'Warm Amber Health',

    // Common Buttons
    'btn.back': 'Back',
    'btn.next': 'Continue',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.downloadReport': 'Download Official Report (PDF)',
    'btn.submitReview': 'Submit Clinical Adjudication',
  },

  hi: {
    // Nav & System
    'app.title': 'DrishtiCare',
    'app.subtitle': 'ग्रामीण स्वास्थ्य सेवा के लिए व्याख्या योग्य एआई-सहायक डायबिटिक रेटिनोपैथी स्क्रीनिंग',
    'app.edition': 'क्लिनिकल संस्करण',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.history': 'रोगी इतिहास',
    'nav.offlineSync': 'ऑफ़लाइन सिंक',
    'nav.settings': 'मॉडल जानकारी और सेटिंग्स',
    'nav.login': 'लॉग इन',
    'nav.logout': 'लॉग आउट',
    'nav.online': 'ऑनलाइन',
    'nav.offline': 'ऑफ़लाइन मोड',
    'nav.syncing': 'सिंक हो रहा है...',
    'nav.sync': 'सिंक करें',

    // Dashboard
    'dash.welcome': 'फ्रंटलाइन दृष्टि स्क्रीनिंग डैशबोर्ड',
    'dash.subtitle': 'प्राथमिक स्वास्थ्य केंद्रों के लिए टेली-ऑप्थल्मोलॉजी ट्राइएज',
    'dash.totalScreened': 'कुल स्क्रीन किए गए रोगी',
    'dash.referableCases': 'रेफरल योग्य डीआर मामले',
    'dash.pendingReview': 'लंबित डॉक्टर समीक्षा',
    'dash.offlineQueue': 'लंबित ऑफ़लाइन कतार',
    'dash.newScreening': 'नई रोगी स्क्रीनिंग शुरू करें',
    'dash.recentScreenings': 'हालिया स्क्रीनिंग रिकॉर्ड',
    'dash.syncAll': 'सभी ऑफ़लाइन रिकॉर्ड सिंक करें',
    'dash.filterAll': 'सभी रोगी',
    'dash.filterReferable': 'रेफरल मामले',
    'dash.urgent': 'तत्काल रेफरल',
    'dash.routine': 'नियमित समीक्षा',
    'dash.normal': 'सामान्य / गैर-रेफरल',

    // Stepper
    'step.image': 'छवि अधिग्रहण',
    'step.quality': 'गुणवत्ता द्वार',
    'step.enhance': 'छवि संवर्धन',
    'step.analysis': 'एआई विश्लेषण',
    'step.results': 'निदान परिणाम',
    'step.explain': 'व्याख्यात्मकता',
    'step.review': 'डॉक्टर समीक्षा',
    'step.triage': 'जोखिम ट्राइएज',
    'step.report': 'क्लिनिकल रिपोर्ट',

    // Screening Image & Stitching
    'screen.eyeSelection': 'परीक्षण के अधीन आंख चुनें',
    'screen.leftEye': 'बाईं आंख (OS)',
    'screen.rightEye': 'दाईं आंख (OD)',
    'screen.imageSource': 'कैप्चर विधि',
    'screen.fundusCamera': 'फंडस कैमरा',
    'screen.portableCamera': 'मोबाइल / पोर्टेबल कैमरा',
    'screen.uploadImage': 'छवि फ़ाइल अपलोड करें',
    'screen.loadSample': 'क्लिनिकल नमूना फंडस लोड करें',
    'screen.startCamera': 'लाइव कैमरा शुरू करें',
    'screen.stopCamera': 'कैमरा बंद करें',
    'screen.capturePhoto': 'फोटो लें',
    'screen.selectFile': 'फ़ाइल चुनें',
    'screen.dragDrop': 'या फंडस छवि यहां खींचें और छोड़ें',
    'screen.stitchMode': 'दोहरी-फ़ील्ड रेटिनल स्टिचिंग (मोज़ेक)',
    'screen.singleFieldMode': 'एकल-फ़ील्ड स्क्रीनिंग',
    'screen.maculaField': 'फ़ील्ड 1: मैकुला-केंद्रित',
    'screen.discField': 'फ़ील्ड 2: ऑप्टिक डिस्क-केंद्रित',
    'screen.stitchAction': 'फ़ील्ड को पैनोरमिक मोज़ेक में स्टिच करें',
    'screen.stitching': 'रेटिनल फ़ील्ड का संरेखण और स्टिचिंग जारी है...',
    'screen.stitchSuccess': 'रेटिनल फ़ील्ड सफलतापूर्वक पैनोरमिक मोज़ेक में स्टिच हो गए!',
    'screen.proceedWithImage': 'गुणवत्ता द्वार पर आगे बढ़ें',

    // Quality Gate
    'quality.title': 'स्वचालित कंप्यूटर विज़न गुणवत्ता गेट',
    'quality.subtitle': 'वास्तविक समय फोकस, रोशनी, चकाचौंध और कवरेज जांच',
    'quality.overallScore': 'समग्र ऑप्टिकल गुणवत्ता स्कोर',
    'quality.acceptable': 'एआई स्क्रीनिंग के लिए उपयुक्त',
    'quality.borderline': 'सीमावर्ती — संवर्धन की सलाह',
    'quality.insufficient': 'अपर्याप्त गुणवत्ता — पुनः कैप्चर की सिफारिश',
    'quality.focus': 'ऑप्टिकल फोकस',
    'quality.illum': 'रोशनी और कंट्रास्ट',
    'quality.glare': 'चकाचौंध कलाकृतियाँ',
    'quality.fov': 'दृष्टि क्षेत्र संरेखण',
    'quality.vessels': 'रक्त वाहिका दृश्यता',
    'quality.coverage': 'रेटिना क्षेत्र कवरेज',
    'quality.proceedAnalysis': 'एआई पाइपलाइन पर आगे बढ़ें',
    'quality.enhanceFirst': 'पहले CLAHE से संवर्धित करें',

    // AI Results & Accuracy
    'result.title': 'व्याख्या योग्य एआई क्लिनिकल निष्कर्ष',
    'result.drGrade': 'डायबिटिक रेटिनोपैथी ग्रेड',
    'result.confidence': 'एआई निदान विश्वास',
    'result.dmeRisk': 'डायबिटिक मैकुलर एडिमा (DME) जोखिम',
    'result.lesionsDetected': 'माइक्रोवास्कुलर घाव पाए गए',
    'result.mas': 'माइक्रोएन्यूरिज्म',
    'result.hems': 'रक्तस्राव (Hemorrhages)',
    'result.hardEx': 'हार्ड एक्सयूडेट्स',
    'result.softEx': 'सॉफ्ट एक्सयूडेट्स (कपास ऊन धब्बे)',
    'result.reliability': 'स्क्रीनिंग विश्वसनीयता और अखंडता',
    'result.suitable': 'क्लिनिकल समीक्षा के लिए उपयुक्त',
    'result.referralRationale': 'क्लिनिकल रेफरल का आधार',
    'result.accuracyMode': 'सटीकता मोड',
    'result.standardAccuracy': 'मानक मॉडल',
    'result.enhancedAccuracy': 'उन्नत मल्टी-फीचर एन्सेम्बल (97.6% सटीकता)',
    'result.audioAssistant': 'ऑडियो निदान वाचन',
    'result.speaking': 'आवाज सारांश चल रहा है...',

    // Clinical Attachments
    'attach.title': 'क्लिनिकल रिकॉर्ड और अटैचमेंट',
    'attach.subtitle': 'HbA1c पर्ची, रक्त शर्करा रिपोर्ट, डॉक्टर के पर्चे और पिछले फंडस फोटो जोड़ें',
    'attach.uploadBtn': 'क्लिनिकल दस्तावेज / फोटो संलग्न करें',
    'attach.noDocs': 'अभी तक कोई दस्तावेज संलग्न नहीं है।',
    'attach.labReport': 'लैब रिपोर्ट / HbA1c',
    'attach.prescription': 'डॉक्टर का पर्चा',
    'attach.fundusHistory': 'पूर्व फंडस तस्वीर',
    'attach.clinicalNote': 'क्लिनिकल केस नोट',

    // Themes
    'theme.title': 'रंग थीम और सुगमता',
    'theme.teal': 'मेडिकल टील (डिफ़ॉल्ट)',
    'theme.dark': 'डार्क ओफ्थल्मोलॉजी रूम',
    'theme.contrast': 'उच्च कंट्रास्ट (धूप के लिए)',
    'theme.indigo': 'आयुष रॉयल इंडिगो',
    'theme.amber': 'वार्म एम्बर हेल्थ',

    // Common Buttons
    'btn.back': 'पीछे',
    'btn.next': 'जारी रखें',
    'btn.save': 'सहेजें',
    'btn.cancel': 'रद्द करें',
    'btn.close': 'बंद करें',
    'btn.downloadReport': 'आधिकारिक रिपोर्ट डाउनलोड करें (PDF)',
    'btn.submitReview': 'क्लिनिकल निर्णय जमा करें',
  },

  kn: {
    // Nav & System
    'app.title': 'DrishtiCare',
    'app.subtitle': 'ಗ್ರಾಮೀಣ ಆರೋಗ್ಯ ಸೇವೆಗಾಗಿ ಎಕ್ಸ್‌ಪ್ಲೇನಬಲ್ AI-ನೆರವಿನ ಡಯಾಬಿಟಿಕ್ ರೆಟಿನೋಪತಿ ಸ್ಕ್ರೀನಿಂಗ್',
    'app.edition': 'ಕ್ಲಿನಿಕಲ್ ಆವೃತ್ತಿ',
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.history': 'ರೋಗಿಯ ಇತಿಹಾಸ',
    'nav.offlineSync': 'ಆಫ್‌ಲೈನ್ ಸಿಂಕ್',
    'nav.settings': 'ಮಾದರಿ ಮಾಹಿತಿ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    'nav.login': 'ಲಾಗಿನ್',
    'nav.logout': 'ಲಾಗ್‌ಔಟ್',
    'nav.online': 'ಆನ್‌ಲೈನ್',
    'nav.offline': 'ಆಫ್‌ಲೈನ್ ಮೋಡ್',
    'nav.syncing': 'ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...',
    'nav.sync': 'ಸಿಂಕ್ ಮಾಡಿ',

    // Dashboard
    'dash.welcome': 'ಪ್ರಾಥಮಿಕ ದೃಷ್ಟಿ ತಪಾಸಣೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'dash.subtitle': 'ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳಿಗೆ ಟೆಲಿ-ನೇತ್ರಶಾಸ್ತ್ರ ಟ್ರಯಾಜ್ ವ್ಯವಸ್ಥೆ',
    'dash.totalScreened': 'ಒಟ್ಟು ತಪಾಸಣೆಗೊಂಡ ರೋಗಿಗಳು',
    'dash.referableCases': 'ರೆಫರಲ್ ಮಾಡಬೇಕಾದ ಡಿಆರ್ ಪ್ರಕರಣಗಳು',
    'dash.pendingReview': 'ವೈದ್ಯರ ಪರಿಶೀಲನೆ ಬಾಕಿ',
    'dash.offlineQueue': 'ಆಫ್‌ಲೈನ್ ಸರದಿಯಲ್ಲಿ ಬಾಕಿ',
    'dash.newScreening': 'ಹೊಸ ರೋಗಿ ಸ್ಕ್ರೀನಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ',
    'dash.recentScreenings': 'ಇತ್ತೀಚಿನ ಸ್ಕ್ರೀನಿಂಗ್ ದಾಖಲೆಗಳು',
    'dash.syncAll': 'ಎಲ್ಲಾ ಆಫ್‌ಲೈನ್ ದಾಖಲೆಗಳನ್ನು ಸಿಂಕ್ ಮಾಡಿ',
    'dash.filterAll': 'ಎಲ್ಲಾ ರೋಗಿಗಳು',
    'dash.filterReferable': 'ರೆಫರಲ್ ಪ್ರಕರಣಗಳು',
    'dash.urgent': 'ತುರ್ತು ರೆಫರಲ್',
    'dash.routine': 'ವಾಡಿಕೆಯ ಪರಿಶೀಲನೆ',
    'dash.normal': 'ಸಾಮಾನ್ಯ / ರೆಫರಲ್ ಅಗತ್ಯವಿಲ್ಲ',

    // Stepper
    'step.image': 'ಚಿತ್ರ ಸೆರೆಹಿಡಿಯುವಿಕೆ',
    'step.quality': 'ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ',
    'step.enhance': 'ಚಿತ್ರ ವರ್ಧನೆ',
    'step.analysis': 'AI ವಿಶ್ಲೇಷಣೆ',
    'step.results': 'ರೋಗನಿರ್ಣಯ ಫಲಿತಾಂಶಗಳು',
    'step.explain': 'ವಿವರಣಾತ್ಮಕತೆ',
    'step.review': 'ವೈದ್ಯರ ಪರಿಶೀಲನೆ',
    'step.triage': 'ಅಪಾಯ ವರ್ಗೀಕರಣ',
    'step.report': 'ಕ್ಲಿನಿಕಲ್ ವರದಿ',

    // Screening Image & Stitching
    'screen.eyeSelection': 'ಪರೀಕ್ಷೆಗೆ ಒಳಪಡುವ ಕಣ್ಣನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    'screen.leftEye': 'ಎಡಗಣ್ಣು (OS)',
    'screen.rightEye': 'ಬಲಗಣ್ಣು (OD)',
    'screen.imageSource': 'ಚಿತ್ರ ಸೆರೆಹಿಡಿಯುವ ವಿಧಾನ',
    'screen.fundusCamera': 'ಫಂಡಸ್ ಕ್ಯಾಮೆರಾ',
    'screen.portableCamera': 'ಮೊಬೈಲ್ / ಪೋರ್ಟಬಲ್ ಕ್ಯಾಮೆರಾ',
    'screen.uploadImage': 'ಚಿತ್ರ ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    'screen.loadSample': 'ಕ್ಲಿನಿಕಲ್ ಮಾದರಿ ಫಂಡಸ್ ಲೋಡ್ ಮಾಡಿ',
    'screen.startCamera': 'ಲೈವ್ ಕ್ಯಾಮೆರಾ ಪ್ರಾರಂಭಿಸಿ',
    'screen.stopCamera': 'ಕ್ಯಾಮೆರಾ ನಿಲ್ಲಿಸಿ',
    'screen.capturePhoto': 'ಫೋಟೋ ಸೆರೆಹಿಡಿಯಿರಿ',
    'screen.selectFile': 'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ',
    'screen.dragDrop': 'ಅಥವಾ ಫಂಡಸ್ ಚಿತ್ರವನ್ನು ಇಲ್ಲಿ ಎಳೆಯಿರಿ',
    'screen.stitchMode': 'ಡ್ಯುಯಲ್-ಫೀಲ್ಡ್ ರೆಟಿನಲ್ ಸ್ಟಿಚಿಂಗ್ (ಮೊಸಾಯಿಕ್)',
    'screen.singleFieldMode': 'ಏಕ-ಫೀಲ್ಡ್ ಸ್ಕ್ರೀನಿಂಗ್',
    'screen.maculaField': 'ಫೀಲ್ಡ್ 1: ಮ್ಯಾಕುಲಾ-ಕೇಂದ್ರಿತ',
    'screen.discField': 'ಫೀಲ್ಡ್ 2: ಆಪ್ಟಿಕ್ ಡಿಸ್ಕ್-ಕೇಂದ್ರಿತ',
    'screen.stitchAction': 'ಫೀಲ್ಡ್‌ಗಳನ್ನು ವಿಶಾಲ ಮೊಸಾಯಿಕ್ ಆಗಿ ಸ್ಟಿಚ್ ಮಾಡಿ',
    'screen.stitching': 'ರೆಟಿನಾ ಫೀಲ್ಡ್‌ಗಳ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಸ್ಟಿಚಿಂಗ್ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ...',
    'screen.stitchSuccess': 'ರೆಟಿನಾ ಫೀಲ್ಡ್‌ಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸ್ಟಿಚ್ ಮಾಡಲಾಗಿದೆ!',
    'screen.proceedWithImage': 'ಗುಣಮಟ್ಟ ಗೇಟ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ',

    // Quality Gate
    'quality.title': 'ಸ್ವಯಂಚಾಲಿತ ಕಂಪ್ಯೂಟರ್ ವಿಷನ್ ಗುಣಮಟ್ಟ ಗೇಟ್',
    'quality.subtitle': 'ಫೋಕಸ್, ಬೆಳಕು, ಹೊಳಪು ಮತ್ತು ವ್ಯಾಪ್ತಿಯ ನೈಜ-ಸಮಯದ ಪರಿಶೀಲನೆ',
    'quality.overallScore': 'ಒಟ್ಟಾರೆ ಆಪ್ಟಿಕಲ್ ಗುಣಮಟ್ಟ ಸ್ಕೋರ್',
    'quality.acceptable': 'AI ಸ್ಕ್ರೀನಿಂಗ್‌ಗೆ ಸೂಕ್ತವಾಗಿದೆ',
    'quality.borderline': 'ಸಾಧಾರಣ — ವರ್ಧನೆಗೆ ಸಲಹೆ ನೀಡಲಾಗಿದೆ',
    'quality.insufficient': 'ಅಸಮರ್ಪಕ ಗುಣಮಟ್ಟ — ಮರು-ಸೆರೆಹಿಡಿಯಲು ಶಿಫಾರಸು',
    'quality.focus': 'ಆಪ್ಟಿಕಲ್ ಫೋಕಸ್',
    'quality.illum': 'ಬೆಳಕು ಮತ್ತು ಕಾಂಟ್ರಾಸ್ಟ್',
    'quality.glare': 'ಹೊಳಪಿನ ಕಲಾಕೃತಿಗಳು',
    'quality.fov': 'ಕ್ಷೇತ್ರ ಕೇಂದ್ರಿತತೆ',
    'quality.vessels': 'ರಕ್ತನಾಳಗಳ ಗೋಚರತೆ',
    'quality.coverage': 'ರೆಟಿನಾ ಪ್ರದೇಶದ ವ್ಯಾಪ್ತಿ',
    'quality.proceedAnalysis': 'AI ಪ್ರಕ್ರಿಯೆಗೆ ಮುಂದುವರಿಯಿರಿ',
    'quality.enhanceFirst': 'ಮೊದಲು CLAHE ಯೊಂದಿಗೆ ವರ್ಧಿಸಿ',

    // AI Results & Accuracy
    'result.title': 'ವಿವರಣಾತ್ಮಕ AI ಕ್ಲಿನಿಕಲ್ ಫಲಿತಾಂಶ',
    'result.drGrade': 'ಡಯಾಬಿಟಿಕ್ ರೆಟಿನೋಪತಿ ದರ್ಜೆ (DR Grade)',
    'result.confidence': 'AI ರೋಗನಿರ್ಣಯ ವಿಶ್ವಾಸಾರ್ಹತೆ',
    'result.dmeRisk': 'ಡಯಾಬಿಟಿಕ್ ಮ್ಯಾಕ್ಯುಲರ್ ಎಡಿಮಾ (DME) ಅಪಾಯ',
    'result.lesionsDetected': 'ಕಂಡುಬಂದ ರಕ್ತನಾಳದ ಗಾಯಗಳು',
    'result.mas': 'ಮೈಕ್ರೋಅನ್ಯೂರಿಸಮ್‌ಗಳು',
    'result.hems': 'ರಕ್ತಸ್ರಾವಗಳು (Hemorrhages)',
    'result.hardEx': 'ಹಾರ್ಡ್ ಎಕ್ಸ್ಯುಡೇಟ್ಸ್',
    'result.softEx': 'ಸಾಫ್ಟ್ ಎಕ್ಸ್ಯುಡೇಟ್ಸ್',
    'result.reliability': 'ಸ್ಕ್ರೀನಿಂಗ್ ವಿಶ್ವಾಸಾರ್ಹತೆ',
    'result.suitable': 'ವೈದ್ಯರ ಪರಿಶೀಲನೆಗೆ ಸೂಕ್ತವಾಗಿದೆ',
    'result.referralRationale': 'ಕ್ಲಿನಿಕಲ್ ರೆಫರಲ್ ಕಾರಣ',
    'result.accuracyMode': 'ನಿಖರತೆ ಮೋಡ್',
    'result.standardAccuracy': 'ಸ್ಟ್ಯಾಂಡರ್ಡ್ ಎಡ್ಜ್ ಮಾದರಿ',
    'result.enhancedAccuracy': 'ವರ್ಧಿತ ಮಲ್ಟಿ-ಫೀಚರ್ ಎನ್ಸೆಂಬಲ್ (97.6% ನಿಖರತೆ)',
    'result.audioAssistant': 'ಆಡಿಯೋ ಧ್ವನಿ ವಿವರಣೆ',
    'result.speaking': 'ಧ್ವನಿ ಸಾರಾಂಶ ಪ್ಲೇ ಆಗುತ್ತಿದೆ...',

    // Clinical Attachments
    'attach.title': 'ಕ್ಲಿನಿಕಲ್ ದಾಖಲೆಗಳು ಮತ್ತು ಲಗತ್ತುಗಳು (Attachments)',
    'attach.subtitle': 'HbA1c ವರದಿ, ರಕ್ತದ ಗ್ಲೂಕೋಸ್ ವಿವರ, ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮತ್ತು ಹಿಂದಿನ ಫಂಡಸ್ ಫೋಟೋಗಳನ್ನು ಲಗತ್ತಿಸಿ',
    'attach.uploadBtn': 'ದಾಖಲೆ / ಫೋಟೋ ಲಗತ್ತಿಸಿ',
    'attach.noDocs': 'ಇನ್ನೂ ಯಾವುದೇ ದಾಖಲೆ ಲಗತ್ತಿಸಿಲ್ಲ.',
    'attach.labReport': 'ಲ್ಯಾಬ್ ವರದಿ / HbA1c',
    'attach.prescription': 'ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್',
    'attach.fundusHistory': 'ಹಿಂದಿನ ಫಂಡಸ್ ಫೋಟೋ',
    'attach.clinicalNote': 'ಕ್ಲಿನಿಕಲ್ ಕೇಸ್ ಟಿಪ್ಪಣಿ',

    // Themes
    'theme.title': 'ಬಣ್ಣದ ಥೀಮ್ ಮತ್ತು ಪ್ರವೇಶಿಸುವಿಕೆ',
    'theme.teal': 'ಮೆಡಿಕಲ್ ಟೀಲ್ (ಡೀಫಾಲ್ಟ್)',
    'theme.dark': 'ಆಪ್ತಲ್ಮಾಲಜಿ ಡಾರ್ಕ್‌ರೂಮ್ (ಕತ್ತಲೆ ಕೋಣೆ)',
    'theme.contrast': 'ಹೆಚ್ಚಿನ ಕಾಂಟ್ರಾಸ್ಟ್ (ಬಿಸಿಲಿಗೆ ಸೂಕ್ತ)',
    'theme.indigo': 'ಆಯುಷ್ ರಾಯಲ್ ಇಂಡಿಗೊ',
    'theme.amber': 'ವಾರ್ಮ್ ಅಂಬರ್ ಹೆಲ್ತ್',

    // Common Buttons
    'btn.back': 'ಹಿಂದೆ',
    'btn.next': 'ಮುಂದೆ',
    'btn.save': 'ಉಳಿಸಿ',
    'btn.cancel': 'ರದ್ದುಮಾಡಿ',
    'btn.close': 'ಮುಚ್ಚಿ',
    'btn.downloadReport': 'ಅಧಿಕೃತ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (PDF)',
    'btn.submitReview': 'ಕ್ಲಿನಿಕಲ್ ತೀರ್ಪು ಸಲ್ಲಿಸಿ',
  },

  ta: {
    // Tamil
    'app.title': 'DrishtiCare',
    'app.subtitle': 'கிராமப்புற சுகாதாரத்திற்கான AI-உதவி நீரிழிவு விழித்திரை பரிசோதனை',
    'app.edition': 'மருத்துவ பதிப்பு',
    'nav.dashboard': 'டாஷ்போர்டு',
    'nav.history': 'நோயாளி வரலாறு',
    'nav.offlineSync': 'ஆஃப்லைன் ஒத்திசைவு',
    'nav.settings': 'மாதிரி தகவல் & அமைப்புகள்',
    'nav.login': 'உள்நுழைக',
    'nav.logout': 'வெளியேறு',
    'nav.online': 'ஆன்லைன்',
    'nav.offline': 'ஆஃப்லைன் நிலை',
    'nav.syncing': 'ஒத்திசைக்கிறது...',
    'nav.sync': 'ஒத்திசை',

    'dash.welcome': 'முன்னணி பார்வை பரிசோதனை டாஷ்போர்டு',
    'dash.subtitle': 'ஆரம்ப சுகாதார நிலையங்களுக்கான டெலி-நேத்ராலஜி அமைப்பு',
    'dash.totalScreened': 'மொத்த பரிசோதிக்கப்பட்ட நோயாளிகள்',
    'dash.referableCases': 'பரிந்துரைக்கப்பட வேண்டிய DR வழக்குகள்',
    'dash.pendingReview': 'நிலுவையில் உள்ள மருத்துவர் ஆய்வு',
    'dash.offlineQueue': 'ஆஃப்லைன் வரிசை நிலுவை',
    'dash.newScreening': 'புதிய நோயாளி பரிசோதனை தொடங்கு',
    'dash.recentScreenings': 'சமீபத்திய பரிசோதனை பதிவுகள்',
    'dash.syncAll': 'அனைத்து பதிவுகளையும் ஒத்திசை',
    'dash.urgent': 'அவசர பரிந்துரை',
    'dash.routine': 'வழக்கமான ஆய்வு',
    'dash.normal': 'சாதாரண நிலை',

    'step.image': 'படம் எடுத்தல்',
    'step.quality': 'தரக் கட்டுப்பாடு',
    'step.enhance': 'படம் மேம்பாடு',
    'step.analysis': 'AI பகுப்பாய்வு',
    'step.results': 'கண்டறிதல் முடிவுகள்',
    'step.explain': 'விளக்கக் காட்சி',
    'step.review': 'மருத்துவர் ஆய்வு',
    'step.triage': 'அபாய வகைப்பாடு',
    'step.report': 'மருத்துவ அறிக்கை',

    'screen.eyeSelection': 'பரிசோதிக்கப்படும் கண் தேர்வு',
    'screen.leftEye': 'இடது கண் (OS)',
    'screen.rightEye': 'வலது கண் (OD)',
    'screen.imageSource': 'படம் எடுக்கும் முறை',
    'screen.fundusCamera': 'ஃபண்டஸ் கேமரா',
    'screen.portableCamera': 'மொபைல் / சிறிய கேமரா',
    'screen.uploadImage': 'படக் கோப்பு பதிவேற்று',
    'screen.loadSample': 'மாதிரி ஃபண்டஸ் படம் ஏற்று',
    'screen.startCamera': 'கேமரா தொடங்கு',
    'screen.stopCamera': 'கேமரா நிறுத்து',
    'screen.capturePhoto': 'படம் எடு',
    'screen.stitchMode': 'இரு-புல விழித்திரை இணைத்தல் (மொசைக்)',
    'screen.singleFieldMode': 'ஒற்றை-புல பரிசோதனை',
    'screen.stitchAction': 'புலங்களை அகல மொசைக்காக இணைக்கவும்',
    'screen.stitchSuccess': 'விழித்திரை புலங்கள் வெற்றிகரமாக இணைக்கப்பட்டன!',
    'screen.proceedWithImage': 'தரக் கட்டுப்பாட்டுக்குச் செல்',

    'quality.title': 'கணினி பார்வை தரக் கட்டுப்பாடு',
    'quality.overallScore': 'ஒட்டுமொத்த படத் தரம்',
    'quality.acceptable': 'AI பரிசோதனைக்கு உகந்தது',
    'quality.borderline': 'மேம்படுத்தல் பரிந்துரைக்கப்படுகிறது',
    'quality.insufficient': 'மீண்டும் படம் எடுக்க பரிந்துரை',

    'result.title': 'AI மருத்துவ முடிவு',
    'result.drGrade': 'நீரிழிவு விழித்திரை பாதிப்பு நிலை',
    'result.confidence': 'AI துல்லியம் / நம்பிக்கை',
    'result.dmeRisk': 'DME வீக்க அபாயம்',
    'result.lesionsDetected': 'கண்டறியப்பட்ட இரத்த நாள புண்கள்',
    'result.accuracyMode': 'துல்லிய முறை',
    'result.standardAccuracy': 'நிலையான மாதிரி',
    'result.enhancedAccuracy': 'மேம்பட்ட பல-அம்ச மாதிரி (97.6% துல்லியம்)',
    'result.audioAssistant': 'குரல் வழி முடிவு விளக்கம்',
    'result.speaking': 'குரல் விளக்கம் ஒலிக்கிறது...',

    'attach.title': 'மருத்துவ ஆவணங்கள் & இணைப்புகள்',
    'attach.subtitle': 'HbA1c அறிக்கை, மருந்து சீட்டு, முந்தைய ஃபண்டஸ் புகைப்படங்களை இணைக்கவும்',
    'attach.uploadBtn': 'ஆவணம் / படம் இணைக்கவும்',

    'theme.title': 'வண்ண தீம்கள்',
    'theme.teal': 'மருத்துவ டீல் (இயல்பு)',
    'theme.dark': 'இருண்ட கண் மருத்துவ அறை',
    'theme.contrast': 'அதிக மாறுபாடு (வெயில் பயன்பாடு)',
    'theme.indigo': 'ஆயுஷ் ராயல் இண்டிகோ',
    'theme.amber': 'அம்பர் ஹெல்த்',

    'btn.back': 'பின்செல்',
    'btn.next': 'தொடர்க',
    'btn.save': 'சேமி',
    'btn.cancel': 'ரத்து',
    'btn.close': 'மூடு',
    'btn.downloadReport': 'அறிக்கையை பதிவிறக்கு (PDF)',
    'btn.submitReview': 'மருத்துவர் தீர்ப்பை சமர்ப்பி',
  },

  te: {
    // Telugu
    'app.title': 'DrishtiCare',
    'app.subtitle': 'గ్రామీణ ఆరోగ్య రక్షణ కోసం వివరణాత్మక AI ఆధారిత డయాబెటిక్ రెటినోపతి స్క్రీనింగ్',
    'app.edition': 'క్లినికల్ ఎడిషన్',
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.history': 'రోగి చరిత్ర',
    'nav.offlineSync': 'ఆఫ్‌లైన్ సింక్',
    'nav.settings': 'మోడల్ సమాచారం & సెట్టింగులు',
    'nav.login': 'లాగిన్',
    'nav.logout': 'లాగౌట్',
    'nav.online': 'ఆన్‌లైన్',
    'nav.offline': 'ఆఫ్‌లైన్ మోడ్',
    'nav.syncing': 'సింక్ అవుతోంది...',
    'nav.sync': 'సింక్ చేయండి',

    'dash.welcome': 'ప్రాథమిక దృష్టి పరీక్ష డాష్‌బోర్డ్',
    'dash.subtitle': 'ప్రాథమిక ఆరోగ్య కేంద్రాల కోసం టెలి-నేత్ర వైద్య ట్రయేజ్',
    'dash.totalScreened': 'మొత్తం పరీక్షించిన రోగులు',
    'dash.referableCases': 'రెఫరల్ అవసరమైన DR కేసులు',
    'dash.pendingReview': 'వైద్యుల సమీక్ష పెండింగ్',
    'dash.offlineQueue': 'ఆఫ్‌లైన్ క్యూ పెండింగ్',
    'dash.newScreening': 'కొత్త రోగి స్క్రీనింగ్ ప్రారంభించండి',
    'dash.recentScreenings': 'ఇటీవలి స్క్రీనింగ్ రికార్డులు',
    'dash.syncAll': 'అన్ని ఆఫ్‌లైన్ రికార్డులను సింక్ చేయండి',
    'dash.urgent': 'అత్యవసర రెఫరల్',
    'dash.routine': 'సాధారణ సమీక్ష',
    'dash.normal': 'సాధారణం / రెఫరల్ అవసరం లేదు',

    'step.image': 'చిత్ర సేకరణ',
    'step.quality': 'నాణ్యత తనిఖీ',
    'step.enhance': 'చిత్ర మెరుగుదల',
    'step.analysis': 'AI విశ్లేషణ',
    'step.results': 'నిర్ధారణ ఫలితాలు',
    'step.explain': 'వివరణాత్మకత',
    'step.review': 'డాక్టర్ సమీక్ష',
    'step.triage': 'ప్రమాద వర్గీకరణ',
    'step.report': 'క్లినికల్ నివేదిక',

    'screen.eyeSelection': 'పరీక్షించాల్సిన కన్ను ఎంచుకోండి',
    'screen.leftEye': 'ఎడమ కన్ను (OS)',
    'screen.rightEye': 'కుడి కన్ను (OD)',
    'screen.imageSource': 'చిత్రం తీసుకునే విధానం',
    'screen.fundusCamera': 'ఫండస్ కెమెరా',
    'screen.portableCamera': 'మొబైల్ / పోర్టబుల్ కెమెరా',
    'screen.uploadImage': 'ఇమేజ్ ఫైల్ అప్‌లోడ్ చేయండి',
    'screen.loadSample': 'క్లినికల్ నమూనా ఫండస్ లోడ్ చేయండి',
    'screen.startCamera': 'కెమెరా ప్రారంభించండి',
    'screen.stopCamera': 'కెమెరా ఆపండి',
    'screen.capturePhoto': 'ఫోటో తీయండి',
    'screen.stitchMode': 'డ్యూయల్-ఫీల్డ్ రెటీనా స్టిచింగ్ (మొజాయిక్)',
    'screen.singleFieldMode': 'సింగిల్-ఫీల్డ్ స్క్రీనింగ్',
    'screen.stitchAction': 'ఫీల్డ్‌లను పనోరమిక్ మొజాయిక్‌గా స్టిచ్ చేయండి',
    'screen.stitchSuccess': 'రెటీనా ఫీల్డ్‌లు విజయవంతంగా స్టిచ్ చేయబడ్డాయి!',
    'screen.proceedWithImage': 'నాణ్యత తనిఖీకి వెళ్లండి',

    'quality.title': 'కంప్యూటర్ విజన్ నాణ్యత తనిఖీ',
    'quality.overallScore': 'మొత్తం ఆప్టికల్ నాణ్యత స్కోరు',
    'quality.acceptable': 'AI స్క్రీనింగ్‌కు అనుకూలమైనది',
    'quality.borderline': 'మధ్యస్థం — మెరుగుదల సూచించబడింది',
    'quality.insufficient': 'సరిపోని నాణ్యత — మళ్లీ ఫోటో తీయండి',

    'result.title': 'AI నిర్ధారణ ఫలితం',
    'result.drGrade': 'డయాబెటిక్ రెటినోపతి గ్రేడ్',
    'result.confidence': 'AI నిర్ధారణ ఖచ్చితత్వం',
    'result.dmeRisk': 'DME వాపు ప్రమాదం',
    'result.lesionsDetected': 'గుర్తించిన రక్తనాళాల గాయాలు',
    'result.accuracyMode': 'ఖచ్చితత్వ మోడ్',
    'result.standardAccuracy': 'ప్రామాణిక మోడల్',
    'result.enhancedAccuracy': 'మెరుగైన మల్టీ-ఫీచర్ మోడల్ (97.6% ఖచ్చితత్వం)',
    'result.audioAssistant': 'ఆడియో వాయిస్ వివరణ',
    'result.speaking': 'వాయిస్ సారాంశం ప్లే అవుతోంది...',

    'attach.title': 'క్లినికల్ రికార్డులు & జోడింపులు (Attachments)',
    'attach.subtitle': 'HbA1c నివేదిక, ప్రిస్క్రిప్షన్ మరియు పాత ఫండస్ ఫోటోలను జోడించండి',
    'attach.uploadBtn': 'పత్రం / ఫోటో జోడించండి',

    'theme.title': 'రంగు థీమ్‌లు',
    'theme.teal': 'మెడికల్ టీల్ (డిఫాల్ట్)',
    'theme.dark': 'ఆప్తాల్మాలజీ డార్క్‌రూమ్',
    'theme.contrast': 'హై కాంట్రాస్ట్ (ఎండ వెలుతురు కోసం)',
    'theme.indigo': 'ఆయుష్ రాయల్ ఇండిగో',
    'theme.amber': 'వార్మ్ అంబర్ హెల్త్',

    'btn.back': 'వెనుకకు',
    'btn.next': 'కొనసాగించండి',
    'btn.save': 'సేవ్ చేయండి',
    'btn.cancel': 'రద్దు చేయండి',
    'btn.close': 'మూసివేయండి',
    'btn.downloadReport': 'అధికారిక నివేదిక డౌన్‌లోడ్ చేయండి (PDF)',
    'btn.submitReview': 'వైద్యుల నిర్ణయాన్ని సమర్పించండి',
  },

  mr: {
    // Marathi
    'app.title': 'DrishtiCare',
    'app.subtitle': 'ग्रामीण आरोग्य सेवेसाठी स्पष्टीकरणात्मक AI-सहाय्यित डायबेटिस रेटिनोपॅथी स्क्रीनिंग',
    'app.edition': 'क्लिनिकल आवृत्ती',
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.history': 'रुग्ण इतिहास',
    'nav.offlineSync': 'ऑफलाइन सिंक',
    'nav.settings': 'मॉडेल माहिती आणि सेटिंग्ज',
    'nav.login': 'लॉगिन',
    'nav.logout': 'लॉगआउट',
    'nav.online': 'ऑनलाइन',
    'nav.offline': 'ऑफलाइन मोड',
    'nav.syncing': 'सिंक होत आहे...',
    'nav.sync': 'सिंक करा',

    'dash.welcome': 'प्राथमिक दृष्टी तपासणी डॅशबोर्ड',
    'dash.subtitle': 'प्राथमिक आरोग्य केंद्रांसाठी टेलि-ऑप्थॅल्मॉलॉजी ट्रायज',
    'dash.totalScreened': 'एकूण तपासलेले रुग्ण',
    'dash.referableCases': 'रेफर करण्यायोग्य DR प्रकरणे',
    'dash.pendingReview': 'प्रलंबित डॉक्टर पुनरावलोकन',
    'dash.offlineQueue': 'प्रलंबित ऑफलाइन रांग',
    'dash.newScreening': 'नवीन रुग्ण तपासणी सुरू करा',
    'dash.recentScreenings': 'अलीकडील तपासणी नोंदी',
    'dash.syncAll': 'सर्व ऑफलाइन नोंदी सिंक करा',
    'dash.urgent': 'तातडीचे रेफरल',
    'dash.routine': 'नियमित तपासणी',
    'dash.normal': 'सामान्य / रेफरलची गरज नाही',

    'step.image': 'प्रतिमा संपादन',
    'step.quality': 'गुणवत्ता तपासणी',
    'step.enhance': 'प्रतिमा सुधारणा',
    'step.analysis': 'AI विश्लेषण',
    'step.results': 'निदान निकाल',
    'step.explain': 'स्पष्टीकरण',
    'step.review': 'डॉक्टर पुनरावलोकन',
    'step.triage': 'जोखीम वर्गीकरण',
    'step.report': 'क्लिनिकल अहवाल',

    'screen.eyeSelection': 'तपासणीसाठी डोळा निवडा',
    'screen.leftEye': 'डावा डोळा (OS)',
    'screen.rightEye': 'उजवा डोळा (OD)',
    'screen.imageSource': 'कॅप्चर पद्धत',
    'screen.fundusCamera': 'फंडस कॅमेरा',
    'screen.portableCamera': 'मोबाइल / पोर्टेबल कॅमेरा',
    'screen.uploadImage': 'प्रतिमा फाइल अपलोड करा',
    'screen.loadSample': 'नमुना फंडस लोड करा',
    'screen.startCamera': 'लाइव्ह कॅमेरा सुरू करा',
    'screen.stopCamera': 'कॅमेरा बंद करा',
    'screen.capturePhoto': 'फोटो घ्या',
    'screen.stitchMode': 'ड्युअल-फील्ड रेटिनल स्टिचिंग (मोज़ॅक)',
    'screen.singleFieldMode': 'एकल-फील्ड स्क्रीनिंग',
    'screen.stitchAction': 'फील्ड्स पॅनोरॅमिक मोज़ॅकमध्ये स्टिच करा',
    'screen.stitchSuccess': 'रेटिनल फील्ड्स यशस्वीरित्या स्टिच केले!',
    'screen.proceedWithImage': 'गुणवत्ता तपासणीकडे जा',

    'quality.title': 'संगणक दृष्टी गुणवत्ता तपासणी',
    'quality.overallScore': 'एकूण ऑप्टिकल गुणवत्ता स्कोअर',
    'quality.acceptable': 'AI तपासणीसाठी योग्य',
    'quality.borderline': 'मध्यम — सुधारणा आवश्यक',
    'quality.insufficient': 'अपुरा दर्जा — पुन्हा फोटो घ्या',

    'result.title': 'AI क्लिनिकल निकाल',
    'result.drGrade': 'डायबेटिस रेटिनोपॅथी ग्रेड',
    'result.confidence': 'AI अचूकता / विश्वास',
    'result.dmeRisk': 'DME सूज जोखीम',
    'result.lesionsDetected': 'आढळलेल्या रक्तवाहिन्यांच्या जखमा',
    'result.accuracyMode': 'अचूकता मोड',
    'result.standardAccuracy': 'मानक मॉडेल',
    'result.enhancedAccuracy': 'प्रगत मल्टी-फीचर एन्सेम्बल (97.6% अचूकता)',
    'result.audioAssistant': 'ऑडिओ आवाज मार्गदर्शन',
    'result.speaking': 'आवाज सारांश प्ले होत आहे...',

    'attach.title': 'क्लिनिकल नोंदी आणि संलग्नक (Attachments)',
    'attach.subtitle': 'HbA1c रिपोर्ट, प्रिस्क्रिप्शन आणि मागील फंडस फोटो जोडा',
    'attach.uploadBtn': 'दस्तऐवज / फोटो जोडा',

    'theme.title': 'रंग थीम आणि सुलभता',
    'theme.teal': 'मेडिकल टील (डीफॉल्ट)',
    'theme.dark': 'डार्क ऑप्थॅल्मॉलॉजी रूम',
    'theme.contrast': 'उच्च कॉन्ट्रास्ट (उन्हासाठी)',
    'theme.indigo': 'आयुष रॉयल इंडिगो',
    'theme.amber': 'वॉर्म अंबर हेल्थ',

    'btn.back': 'मागे',
    'btn.next': 'पुढे जा',
    'btn.save': 'जतन करा',
    'btn.cancel': 'रद्द करा',
    'btn.close': 'बंद करा',
    'btn.downloadReport': 'अधिकृत अहवाल डाउनलोड करा (PDF)',
    'btn.submitReview': 'क्लिनिकल निर्णय सबमिट करा',
  },
};

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
  languages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en',
  setLanguage: () => {},
  t: (k) => k,
  languages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('retinal_language') as LanguageCode;
    return (saved && translations[saved]) ? saved : 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setCurrentLanguageState(lang);
    localStorage.setItem('retinal_language', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[currentLanguage];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  return React.createElement(
    LanguageContext.Provider,
    {
      value: {
        currentLanguage,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }
    },
    children
  );
};

export const useLanguage = () => useContext(LanguageContext);
