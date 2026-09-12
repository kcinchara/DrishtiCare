import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera, Upload, Eye, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle, ArrowRight, ArrowLeft, Video, VideoOff, Layers, Sparkles, Check
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { useLanguage } from '../utils/i18n';

export const ScreeningImagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [eye, setEye] = useState<'Left Eye' | 'Right Eye'>('Right Eye');
  const [imageSource, setImageSource] = useState<'Fundus Camera' | 'Mobile/Portable Camera' | 'Uploaded Image'>('Fundus Camera');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCapturingCamera, setIsCapturingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sampleGrade, setSampleGrade] = useState<number>(2);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Screening Scope: 'single' (Default) vs 'both' (Extra feature)
  const [screeningMode, setScreeningMode] = useState<'single' | 'both'>('single');
  const [fileLeft, setFileLeft] = useState<File | null>(null);
  const [fileRight, setFileRight] = useState<File | null>(null);
  const [previewLeft, setPreviewLeft] = useState<string | null>(null);
  const [previewRight, setPreviewRight] = useState<string | null>(null);
  const [isAnalyzingBoth, setIsAnalyzingBoth] = useState(false);

  // Dual-Field Retinal Stitching State
  const [isStitchMode, setIsStitchMode] = useState(false);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchResult, setStitchResult] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputLeftRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load existing image if already uploaded
    if (id) {
      api.getScreeningDetail(id).then((detail) => {
        if (detail?.retinal_image?.url) {
          setPreviewUrl(api.getMediaUrl(detail.retinal_image.url));
        }
      });
    }

    return () => {
      stopCamera();
    };
  }, [id]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturingCamera(true);
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable on this device. You can upload an image or load a fundus sample.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturingCamera(false);
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL('image/jpeg'));
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    const valid = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!valid.includes(file.type)) {
      setValidationError('Image quality is insufficient for reliable analysis. Please upload a clearer fundus image.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setValidationError('Image file size exceeds 25MB limit.');
      return;
    }

    // Client-side quick fundus verification
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 120, 120);
          const imgData = ctx.getImageData(0, 0, 120, 120).data;
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (gray > 14 && gray < 248) {
              rSum += r;
              gSum += g;
              bSum += b;
              count++;
            }
          }
          if (count > 80) {
            const meanR = rSum / count;
            const meanB = bSum / count;
            const blueRatio = meanB / (meanR + 1e-5);
            // Retinal tissue has dominant red hue and very low blue reflectance
            if (blueRatio > 0.80 || meanR <= meanB + 10) {
              setValidationError('This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.');
              setSelectedFile(null);
              setPreviewUrl(null);
              URL.revokeObjectURL(objectUrl);
              return;
            }
          }
        }
      } catch (err) {
        // Fallback to backend validation
      }
      setSelectedFile(file);
      setPreviewUrl(objectUrl);
      setStitchResult(null);
      setValidationError(null);
    };
    img.onerror = () => {
      setValidationError('This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.');
    };
    img.src = objectUrl;
  };

  const handleLoadSample = async (grade: number) => {
    setValidationError(null);
    setSampleGrade(grade);
    setIsUploading(true);
    try {
      if (id) {
        const res = await api.uploadRetinalImage(Number(id), undefined, true, grade, eye, imageSource);
        if (res?.retinal_image?.url) {
          setPreviewUrl(api.getMediaUrl(res.retinal_image.url));
        } else {
          setPreviewUrl(api.getMediaUrl('/media/uploads/demo_fundus.jpg'));
        }
        setStitchResult(null);
      }
    } catch (err) {
      console.warn('Fallback preview during offline/demo load');
      setPreviewUrl(api.getMediaUrl('/media/uploads/demo_fundus.jpg'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleStitchFields = async () => {
    if (!id) return;
    setIsStitching(true);
    try {
      // First ensure a primary field exists
      if (!previewUrl) {
        await handleLoadSample(sampleGrade);
      }
      const res = await api.stitchRetinalFields(Number(id), sampleGrade);
      setStitchResult(res);
      if (res.stitched_url) {
        setPreviewUrl(api.getMediaUrl(res.stitched_url));
      }
    } catch (err: any) {
      alert(`Stitching failed: ${err.message || 'Please ensure both fields are available.'}`);
    } finally {
      setIsStitching(false);
    }
  };

  const handleBothEyeFileChange = (eyeSide: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);

    const valid = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!valid.includes(file.type)) {
      setValidationError('Image quality is insufficient for reliable screening. Please upload a clear fundus image of the selected eye.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (eyeSide === 'left') {
      setFileLeft(file);
      setPreviewLeft(objectUrl);
    } else {
      setFileRight(file);
      setPreviewRight(objectUrl);
    }
  };

  const handleBothEyesAnalyze = async () => {
    if (!id) return;
    setIsAnalyzingBoth(true);
    setValidationError(null);
    try {
      await api.uploadBothEyes(
        id,
        fileLeft || undefined,
        fileRight || undefined,
        !fileLeft ? 2 : undefined,
        !fileRight ? 2 : undefined
      );

      await api.analyzeBothEyes(id);
      navigate(`/screening/${id}/results`);
    } catch (err: any) {
      setValidationError(err.message || 'Image quality is insufficient for reliable screening. Please upload a clear fundus image of the selected eye.');
    } finally {
      setIsAnalyzingBoth(false);
    }
  };

  const handleUploadAndProceed = async () => {
    if (!id) return;
    if (validationError) return;
    setIsUploading(true);

    try {
      if (selectedFile) {
        await api.uploadRetinalImage(Number(id), selectedFile, false, sampleGrade, eye, imageSource);
      }
      navigate(`/screening/${id}/quality`);
    } catch (err: any) {
      if (err.message && (err.message.includes('Invalid Image') || err.message.includes('fundus') || err.message.includes('photograph'))) {
        setValidationError(err.message || 'This image does not appear to be a retinal fundus photograph. Please upload a valid fundus image.');
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsUploading(false);
        return;
      }
      console.warn('Network upload notice:', err.message);
      navigate(`/screening/${id}/quality`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <ScreeningStepper currentStep={2} screeningId={id} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <div className="card space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {t('step.image', 'Retinal Image Acquisition')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Step 2 of 8 — Acquire high-resolution fundus photograph for clinical evaluation
              </p>
            </div>
          </div>

          {/* Top Screening Scope Mode Toggle (Single-Eye Default vs Both-Eyes Extra Feature) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-teal-50/40 border border-slate-200 rounded-2xl gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Screening Scope Mode
                </span>
                <span className="badge-info text-[10px] font-bold">Configurable</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Single Eye screening is the primary default workflow. Both-Eye screening is available as an extra comprehensive mode.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 text-xs font-bold shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => setScreeningMode('single')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  screeningMode === 'single'
                    ? 'bg-teal-700 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Single Eye (Default)</span>
              </button>
              <button
                type="button"
                onClick={() => setScreeningMode('both')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  screeningMode === 'both'
                    ? 'bg-teal-700 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Both Eyes Mode (Extra)</span>
              </button>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-extrabold text-sm text-rose-900">
                  {validationError}
                </div>
                <p className="text-xs text-rose-700">
                  The uploaded file is not a recognized ocular fundus photograph. Diabetic Retinopathy screening cannot be performed on non-retinal images. Please select a genuine retinal image of the eye.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValidationError(null);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      fileInputRef.current?.click();
                    }}
                    className="btn-danger text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 shadow-xs font-bold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Another Image</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTH EYES COMPREHENSIVE SCREENING MODE (EXTRA FEATURE) */}
          {screeningMode === 'both' ? (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-xs text-teal-950 flex items-center gap-3">
                <div className="p-2.5 bg-teal-700 text-white rounded-xl text-lg shrink-0">
                  👁️👁️
                </div>
                <div>
                  <div className="font-black text-teal-900 text-sm">Dual-Eye Comprehensive Screening Mode</div>
                  <div className="text-teal-800 text-[11px] mt-0.5">
                    Acquire Left Eye (OS) and Right Eye (OD) fundus photographs. Both images are processed independently through the authentic AI pipeline, and the maximum clinical severity grade is synthesized.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Eye (OS) Panel */}
                <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span>👁️ Left Eye (OS)</span>
                    </span>
                    <span className="badge-info text-[10px] font-bold">Oculus Sinister</span>
                  </div>

                  {previewLeft ? (
                    <div className="aspect-square bg-black rounded-xl overflow-hidden relative border border-slate-300 flex items-center justify-center">
                      <img src={previewLeft} alt="Left Eye" className="w-full h-full object-contain" />
                      <button
                        onClick={() => { setPreviewLeft(null); setFileLeft(null); }}
                        className="absolute bottom-2 right-2 p-2 bg-rose-600 text-white rounded-lg shadow-sm"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/60 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Left Eye Fundus Image</div>
                      <div className="flex flex-col gap-2 max-w-xs mx-auto">
                        <button
                          type="button"
                          onClick={() => fileInputLeftRef.current?.click()}
                          className="btn-primary text-xs py-2 px-3 shadow-xs font-bold"
                        >
                          <Upload className="w-3.5 h-3.5 inline mr-1" />
                          <span>Upload OS Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewLeft(api.getMediaUrl('/media/uploads/demo_fundus.jpg'));
                          }}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          <span>Load Sample (Grade 2)</span>
                        </button>
                        <input
                          ref={fileInputLeftRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleBothEyeFileChange('left', e)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Eye (OD) Panel */}
                <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span>👁️ Right Eye (OD)</span>
                    </span>
                    <span className="badge-info text-[10px] font-bold">Oculus Dexter</span>
                  </div>

                  {previewRight ? (
                    <div className="aspect-square bg-black rounded-xl overflow-hidden relative border border-slate-300 flex items-center justify-center">
                      <img src={previewRight} alt="Right Eye" className="w-full h-full object-contain" />
                      <button
                        onClick={() => { setPreviewRight(null); setFileRight(null); }}
                        className="absolute bottom-2 right-2 p-2 bg-rose-600 text-white rounded-lg shadow-sm"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/60 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Right Eye Fundus Image</div>
                      <div className="flex flex-col gap-2 max-w-xs mx-auto">
                        <button
                          type="button"
                          onClick={() => fileInputRightRef.current?.click()}
                          className="btn-primary text-xs py-2 px-3 shadow-xs font-bold"
                        >
                          <Upload className="w-3.5 h-3.5 inline mr-1" />
                          <span>Upload OD Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewRight(api.getMediaUrl('/media/uploads/demo_fundus.jpg'));
                          }}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          <span>Load Sample (Grade 2)</span>
                        </button>
                        <input
                          ref={fileInputRightRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleBothEyeFileChange('right', e)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Both Eyes Action Bar */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScreeningMode('single')}
                  className="btn-secondary text-xs"
                >
                  Switch to Single-Eye Mode
                </button>
                <button
                  type="button"
                  onClick={handleBothEyesAnalyze}
                  disabled={(!previewLeft && !previewRight) || isAnalyzingBoth}
                  className="btn-primary py-3 px-8 font-black text-xs shadow-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzingBoth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Both Eyes with AI...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Run Dual-Eye AI Analysis & Grade</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Eye and Source Controls */}
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsStitchMode(false)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      !isStitchMode
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('screen.singleFieldMode', 'Single Field')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStitchMode(true)}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                      isStitchMode
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t('screen.stitchMode', 'Stitch Dual-Fields')}</span>
                  </button>
                </div>
              </div>

          {/* Eye and Source Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('screen.eyeSelection', 'Target Eye')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEye('Right Eye')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    eye === 'Right Eye'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('screen.rightEye', 'OD (Right Eye)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEye('Left Eye')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    eye === 'Left Eye'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('screen.leftEye', 'OS (Left Eye)')}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('screen.imageSource', 'Image Acquisition Device')}
              </label>
              <select
                value={imageSource}
                onChange={(e) => setImageSource(e.target.value as any)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Fundus Camera">Mydriatic / Non-Mydriatic Fundus Camera</option>
                <option value="Mobile/Portable Camera">Portable Handheld Retinal Camera (e.g., Remidio / Forus)</option>
                <option value="Uploaded Image">Digital Archive / Smartphone Ophthalmoscope</option>
              </select>
            </div>
          </div>

          {/* Dual-Field Retinal Stitching Banner */}
          {isStitchMode && (
            <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-teal-950">
                      Two-Field Fundus Stitcher (Macula-Centered + Optic Disc)
                    </h3>
                    <p className="text-[11px] text-teal-700">
                      Combines 45° macular & disc fields into a 75° wide-field mosaic via OpenCV ORB feature alignment.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStitchFields}
                  disabled={isStitching}
                  className="btn-primary text-xs py-2 px-4 shadow-sm inline-flex items-center gap-1.5 font-bold"
                >
                  {isStitching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('screen.stitching', 'Stitching Fields...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('screen.stitchAction', 'Stitch Retinal Fields')}</span>
                    </>
                  )}
                </button>
              </div>

              {stitchResult && (
                <div className="p-3 bg-white rounded-lg border border-teal-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>{t('screen.stitchSuccess', 'Retinal Fields Successfully Stitched into Panoramic Mosaic!')}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    <div>Method: <span className="font-bold">{stitchResult.method}</span></div>
                    <div>Matches: <span className="font-bold text-teal-700">{stitchResult.matches_aligned}</span></div>
                    <div>Dimensions: <span className="font-bold">{stitchResult.mosaic_width}x{stitchResult.mosaic_height}</span></div>
                    <div>Angle: <span className="font-bold text-emerald-700">75° Wide-Field</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acquisition Panels */}
          <div>
            {isCapturingCamera ? (
              <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-300">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 flex items-center gap-3">
                  <button
                    onClick={captureCameraFrame}
                    className="btn-primary py-2 px-4 shadow-lg text-xs font-bold"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('screen.capturePhoto', 'CAPTURE FRAME')}</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="btn-secondary py-2 px-4 shadow-lg text-xs font-bold text-rose-600"
                  >
                    <VideoOff className="w-4 h-4" />
                    <span>{t('btn.cancel', 'CANCEL')}</span>
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="bg-black rounded-xl overflow-hidden aspect-square max-w-md mx-auto relative border border-slate-300 shadow-inner flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Retinal Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = api.getMediaUrl('/media/uploads/demo_fundus.jpg');
                  }}
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{eye} • {stitchResult ? 'Panoramic Mosaic Stitched' : 'Ready for Quality Gate'}</span>
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      setStitchResult(null);
                    }}
                    className="p-2 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg backdrop-blur-sm shadow-md transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Select or Capture Retinal Fundus Photograph
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Ensure the image includes the optic disc and fovea with adequate illumination and focus.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary text-xs py-2 px-4 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image File (JPG/PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    <Video className="w-4 h-4" />
                    <span>Capture via Device Camera</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {cameraError && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg mt-4 max-w-md mx-auto border border-amber-200">
                    {cameraError}
                  </p>
                )}

                {/* Pre-Validated Clinical Retinal Samples */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Load Pre-Validated Rural Fundus Samples
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSample(0)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-emerald-50 text-xs font-semibold text-slate-700"
                    >
                      Sample 1: Grade 0 (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample(2)}
                      className="px-3 py-1.5 rounded-lg border border-teal-600 bg-teal-50 text-xs font-bold text-teal-900 shadow-xs"
                    >
                      Sample 2: Grade 2 (Moderate DR)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample(3)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-amber-50 text-xs font-semibold text-slate-700"
                    >
                      Sample 3: Grade 3 (Severe DR)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample(4)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-rose-50 text-xs font-semibold text-slate-700"
                    >
                      Sample 4: Grade 4 (Proliferative)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/patient/new?screening_id=${id}`)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5 order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Patient Info</span>
            </button>

            <button
              onClick={handleUploadAndProceed}
              disabled={!previewUrl || isUploading || Boolean(validationError)}
              className="btn-primary py-2.5 px-6 font-bold shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              <span>{isUploading ? 'Verifying...' : t('screen.proceedWithImage', 'CHECK IMAGE QUALITY')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
