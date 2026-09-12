import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Columns, Layers, Eye } from 'lucide-react';

interface FundusImageViewerProps {
  originalImage: string;
  overlayImage?: string;
  gradcamImage?: string;
  title?: string;
  showToggle?: boolean;
}

export const FundusImageViewer: React.FC<FundusImageViewerProps> = ({
  originalImage,
  overlayImage,
  gradcamImage,
  title = 'Retinal Fundus Viewer',
  showToggle = true
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'original' | 'overlay' | 'gradcam' | 'side-by-side'>('original');

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 && position.x === 0 && position.y === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Determine current active image for single view mode
  let activeImage = originalImage;
  if (viewMode === 'overlay' && overlayImage) {
    activeImage = overlayImage;
  } else if (viewMode === 'gradcam' && gradcamImage) {
    activeImage = gradcamImage;
  }

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col select-none">
      {/* Viewer Header Toolbar */}
      <div className="bg-slate-800/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold tracking-wide text-slate-200">{title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* View Mode Selectors */}
        {showToggle && (
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'original' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Original
            </button>
            {overlayImage && (
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'overlay' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Lesions
                </span>
              </button>
            )}
            {gradcamImage && (
              <button
                type="button"
                onClick={() => setViewMode('gradcam')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'gradcam' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Grad-CAM
              </button>
            )}
            {(overlayImage || gradcamImage) && (
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'side-by-side' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <Columns className="w-3 h-3" />
                  Side-by-Side
                </span>
              </button>
            )}
          </div>
        )}

        {/* Zoom & Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
            title="Fit to Screen / Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Stage Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[400px] sm:h-[480px] bg-black overflow-hidden flex items-center justify-center ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {viewMode === 'side-by-side' ? (
          <div className="w-full h-full grid grid-cols-2 gap-1 p-2">
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <span className="absolute top-2 left-2 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-black/70 text-slate-200 border border-slate-700">
                Original Fundus
              </span>
              <img
                src={originalImage}
                alt="Original Fundus"
                className="max-h-full max-w-full object-contain pointer-events-none"
              />
            </div>
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <span className="absolute top-2 left-2 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-teal-900/80 text-teal-200 border border-teal-700">
                {gradcamImage ? 'Grad-CAM Attention' : 'Lesion Overlay'}
              </span>
              <img
                src={gradcamImage || overlayImage}
                alt="AI Analysis"
                className="max-h-full max-w-full object-contain pointer-events-none"
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            <img
              src={activeImage}
              alt="Fundus Retinal Photograph"
              className="max-h-[380px] sm:max-h-[460px] object-contain rounded shadow-lg pointer-events-none"
              style={{ aspectRatio: 'auto' }}
            />
          </div>
        )}

        {/* Pan instruction tooltip when zoomed */}
        {zoom > 1 && (
          <div className="absolute bottom-3 right-3 pointer-events-none bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md">
            Drag to pan around fundus
          </div>
        )}
      </div>
    </div>
  );
};

export default FundusImageViewer;
