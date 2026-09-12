import React, { useState } from 'react';
import { Sliders, Eye, Sparkles } from 'lucide-react';

interface Props {
  originalUrl: string;
  enhancedUrl: string;
  originalLabel?: string;
  enhancedLabel?: string;
}

export const ImageComparisonSlider: React.FC<Props> = ({
  originalUrl,
  enhancedUrl,
  originalLabel = 'Original Capture',
  enhancedLabel = 'CLAHE Enhanced & Denoised'
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');

  return (
    <div className="card space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Retinal Photographic Enhancement Comparison
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'split' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interactive Split
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'side-by-side' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side by Side
          </button>
        </div>
      </div>

      {/* Comparison View */}
      {viewMode === 'split' ? (
        <div className="relative w-full max-w-2xl mx-auto aspect-square rounded-xl overflow-hidden bg-black select-none border border-slate-300 shadow-inner">
          {/* Enhanced (Bottom) */}
          <img
            src={enhancedUrl}
            alt="Enhanced Fundus"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Original (Top layer clipped) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={originalUrl}
              alt="Original Fundus"
              className="absolute inset-0 w-full h-full object-contain max-w-none pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* Dividing Vertical Line & Drag Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-md flex items-center justify-center pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-lg border-2 border-teal-600 flex items-center justify-center text-teal-700">
              <Sliders className="w-4 h-4" />
            </div>
          </div>

          {/* HTML range slider overlay for responsive mouse/touch control */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
          />

          {/* Labels on corners */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold">
            {originalLabel} ({sliderPosition}%)
          </div>
          <div className="absolute top-3 right-3 bg-teal-950/80 backdrop-blur-sm text-teal-200 px-2.5 py-1 rounded text-xs font-semibold">
            {enhancedLabel}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black rounded-xl overflow-hidden aspect-square border border-slate-200 relative flex items-center justify-center">
            <img src={originalUrl} alt={originalLabel} className="w-full h-full object-contain" />
            <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-0.5 rounded text-xs font-semibold">
              {originalLabel}
            </div>
          </div>
          <div className="bg-black rounded-xl overflow-hidden aspect-square border border-slate-200 relative flex items-center justify-center">
            <img src={enhancedUrl} alt={enhancedLabel} className="w-full h-full object-contain" />
            <div className="absolute top-3 left-3 bg-teal-900/80 text-teal-200 px-2 py-0.5 rounded text-xs font-semibold">
              {enhancedLabel}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-slate-500">
        Drag slider left/right to inspect enhancement of fine microvascular details and lesion margins.
      </p>
    </div>
  );
};
