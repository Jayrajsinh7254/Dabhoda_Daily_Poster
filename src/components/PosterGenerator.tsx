"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Calendar,
  Share2,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Eye,
  Sliders,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  DEFAULT_TRANSFORM,
  ImageTransform,
  getKolkataDateInfo,
  loadImage,
  renderPosterToCanvas,
  downloadCanvasAsPng,
} from "@/lib/poster-generator";

export default function PosterGenerator({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  // Current date info in Asia/Kolkata (populated on client mount)
  const [dateInfo, setDateInfo] = useState(() => ({
    isoDate: "2026-10-14",
    displayDate: "14/10/2026",
    weekdayEnglish: "Wednesday",
    weekdayGujarati: "બુધવાર",
  }));
  const [customIsoDate, setCustomIsoDate] = useState("2026-10-14");
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Uploaded photo state (defaults to authentic idol photo)
  const [photoSrc, setPhotoSrc] = useState<string>("/assets/default-idol.jpg");
  const [photoFileName, setPhotoFileName] = useState<string>("default-idol.jpg");
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_TRANSFORM);

  // Cached HTML Image elements for instant, silky-smooth 60fps canvas re-renders
  const cachedOverlayRef = useRef<HTMLImageElement | null>(null);
  const cachedPhotoRef = useRef<HTMLImageElement | null>(null);

  // Canvas & rendering state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

  // Drag to pan state
  const [isDragging, setIsDragging] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize live Kolkata date on client mount
  useEffect(() => {
    const live = getKolkataDateInfo();
    setDateInfo(live);
    setCustomIsoDate(live.isoDate);
  }, []);

  // Update date info when custom date changes
  const handleDateChange = (newIsoDate: string) => {
    setCustomIsoDate(newIsoDate);
    setIsCustomDate(true);
    const updated = getKolkataDateInfo(newIsoDate);
    setDateInfo(updated);
  };

  const handleResetDate = () => {
    setIsCustomDate(false);
    const today = getKolkataDateInfo();
    setCustomIsoDate(today.isoDate);
    setDateInfo(today);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setRenderError("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }

    setRenderError(null);
    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setPhotoSrc(e.target.result);
        setTransform(DEFAULT_TRANSFORM); // Reset transforms on new photo
      }
    };
    reader.onerror = () => {
      setRenderError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Draw current cached state to canvas immediately
  const drawFrame = useCallback(() => {
    if (!canvasRef.current || !cachedPhotoRef.current || !cachedOverlayRef.current) return;
    try {
      renderPosterToCanvas(
        canvasRef.current,
        cachedPhotoRef.current,
        cachedOverlayRef.current,
        dateInfo,
        transform
      );
      setIsRendering(false);
    } catch (err) {
      console.error("Canvas draw error:", err);
      setRenderError(err instanceof Error ? err.message : "Error rendering canvas");
    }
  }, [dateInfo, transform]);

  // Load / Reload images when photoSrc changes
  useEffect(() => {
    let active = true;
    setIsRendering(true);

    Promise.all([
      loadImage(photoSrc),
      cachedOverlayRef.current ? Promise.resolve(cachedOverlayRef.current) : loadImage("/assets/template-overlay.png"),
    ])
      .then(([photoImg, overlayImg]) => {
        if (!active) return;
        cachedPhotoRef.current = photoImg;
        cachedOverlayRef.current = overlayImg;
        drawFrame();
      })
      .catch((err) => {
        if (!active) return;
        console.error("Image loading error:", err);
        setRenderError(err instanceof Error ? err.message : "Failed to load poster assets");
        setIsRendering(false);
      });

    return () => {
      active = false;
    };
  }, [photoSrc, drawFrame]);

  // When transform or dateInfo updates, re-draw canvas instantly from cache
  useEffect(() => {
    if (cachedPhotoRef.current && cachedOverlayRef.current) {
      drawFrame();
    }
  }, [transform, dateInfo, drawFrame]);

  // Transform controls
  const updateZoom = (delta: number) => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.min(3.0, Math.max(0.5, parseFloat((prev.zoom + delta).toFixed(2)))),
    }));
  };

  const updatePan = (dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  };

  const rotateClockwise = () => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  const resetTransform = () => {
    setTransform(DEFAULT_TRANSFORM);
  };

  // Touch and mouse dragging to pan the photo directly on the canvas
  const handlePointerDown = (clientX: number, clientY: number, isTouch = false) => {
    if (isTouch && !isPanMode) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startPanX: transform.panX,
      startPanY: transform.panY,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number, isTouch = false) => {
    if (!isDragging) return;
    if (isTouch && !isPanMode) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    const scale = 2.5; // Scale screen preview coordinates to canvas resolution
    setTransform((prev) => ({
      ...prev,
      panX: dragStartRef.current.startPanX + dx * scale,
      panY: dragStartRef.current.startPanY + dy * scale,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Window-level release to ensure drag never sticks during scrolling
  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handleGlobalUp);
    window.addEventListener("touchend", handleGlobalUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalUp);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, []);

  // Download Action
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const cleanDate = dateInfo.displayDate.replace(/\//g, "-");
    const filename = `dabhodiya-hanuman-darshan-${cleanDate}.png`;
    downloadCanvasAsPng(canvasRef.current, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  // WhatsApp Native Share or Open
  const handleWhatsAppAction = async () => {
    if (!canvasRef.current) return;

    if (navigator.canShare) {
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          const cleanDate = dateInfo.displayDate.replace(/\//g, "-");
          const file = new File([blob], `dabhodiya-hanuman-darshan-${cleanDate}.png`, {
            type: "image/png",
          });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `શ્રી ડભોડીયા હનુમાનજી દૈનિક દર્શન - ${dateInfo.displayDate}`,
              text: `શ્રી ડભોડીયા હનુમાનજી દૈનિક દર્શન\nતારીખ: ${dateInfo.displayDate} (${dateInfo.weekdayGujarati})\n॥ જય શ્રી રામ ॥ ॥ જય શ્રી હનુમાન ॥`,
            });
            return;
          }
        }, "image/png");
      } catch (e) {
        console.warn("Share fallback:", e);
      }
    }

    handleDownload();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Top Banner / Sacred Temple Header */}
      {!hideHeader && (
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Asia/Kolkata IST • Official Media Generator</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 font-devotional mb-2">
            શ્રી ડભોડીયા હનુમાનજી
          </h1>
          <p className="text-base sm:text-lg font-medium text-orange-200/90 font-gujarati">
            દૈનિક દર્શન પોસ્ટર જનરેટર (Daily Darshan Poster Generator)
          </p>
        </header>
      )}

      {/* Main Grid: Left Controls, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Upload Idol Photo */}
          <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                ૧. આજનો દર્શન ફોટો અપલોડ કરો
              </label>
              {photoFileName && (
                <span className="text-xs text-stone-400 truncate max-w-[150px]">
                  {photoFileName}
                </span>
              )}
            </div>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />

            {/* Drop / Click Target */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className="group cursor-pointer border-2 border-dashed border-amber-500/30 hover:border-amber-400 rounded-xl p-5 text-center transition-all bg-gradient-to-b from-stone-800/40 to-stone-950/60 hover:from-amber-500/10 hover:to-orange-500/5"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-105">
                <Upload className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-stone-200 mb-1">
                ફોટો પસંદ કરવા ક્લિક કરો અથવા ડ્રેગ કરો
              </p>
              <p className="text-xs text-stone-400">
                JPG, JPEG, PNG અથવા WebP (મોબાઈલ કેમેરા ફોટો સપોર્ટેડ)
              </p>
            </div>

            {/* Quick Actions for Image */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                Replace Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoSrc("/assets/default-idol.jpg");
                  setPhotoFileName("default-idol.jpg");
                  setTransform(DEFAULT_TRANSFORM);
                }}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                title="Reset to default temple idol"
              >
                મૂળ ફોટો વાપરો
              </button>
            </div>
          </div>

          {/* Card 2: Crop, Zoom & Framing Controls */}
          <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                ૨. ફોટો એડજસ્ટમેન્ટ (Zoom & Frame)
              </span>
              <button
                type="button"
                onClick={resetTransform}
                className="text-xs text-stone-400 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
                title="Reset crop, zoom and position"
              >
                <RefreshCw className="w-3 h-3" />
                રીસેટ
              </button>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-stone-300">
                <span>ઝૂમ (Zoom)</span>
                <span className="font-mono text-amber-400">
                  {Math.round(transform.zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateZoom(-0.1)}
                  className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center border border-stone-700 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={transform.zoom}
                  onChange={(e) =>
                    setTransform((prev) => ({
                      ...prev,
                      zoom: parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => updateZoom(0.1)}
                  className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center border border-stone-700 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rotate & Position Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
              {/* Rotate Button */}
              <div>
                <span className="text-xs text-stone-300 block mb-1.5">રોટેશન</span>
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>૯૦° ફેરવો ({transform.rotation}°)</span>
                </button>
              </div>

              {/* Pan Arrows */}
              <div>
                <span className="text-xs text-stone-300 block mb-1.5">પોઝિશન (ખસેડો)</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => updatePan(0, -20)}
                    className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePan(0, 20)}
                    className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePan(-20, 0)}
                    className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700 cursor-pointer"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePan(20, 0)}
                    className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700 cursor-pointer"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 mt-3 flex items-center gap-1">
              <Move className="w-3 h-3 text-amber-400 inline" />
              ટિપ: તમે ફોટોને સ્ક્રીન પર સીધો ડ્રેગ (drag) કરીને પણ ખસેડી શકો છો.
            </p>
          </div>

          {/* Card 3: Date & Weekday Settings */}
          <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                ૩. તારીખ અને વાર (Date & Weekday)
              </label>
              {isCustomDate && (
                <button
                  type="button"
                  onClick={handleResetDate}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  આજની તારીખ કરો
                </button>
              )}
            </div>

            {/* Display Cards */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-stone-950/80 rounded-xl p-3 border border-stone-800">
                <span className="text-[11px] text-stone-400 block mb-0.5">તારીખ (Date)</span>
                <span className="text-base font-bold text-amber-300 font-mono">
                  {dateInfo.displayDate}
                </span>
              </div>
              <div className="bg-stone-950/80 rounded-xl p-3 border border-stone-800">
                <span className="text-[11px] text-stone-400 block mb-0.5">વાર (Weekday)</span>
                <span className="text-base font-bold text-orange-400 font-gujarati">
                  {dateInfo.weekdayGujarati}
                </span>
              </div>
            </div>

            {/* Optional Date Override Picker */}
            <div className="pt-2 border-t border-stone-800">
              <label className="text-xs text-stone-400 block mb-1">
                તારીખ બદલવી હોય તો (Date Override):
              </label>
              <input
                type="date"
                value={customIsoDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Preview & Download Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-4 self-start">
          <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-sm">
            {/* Header above preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-stone-200">
                  લાઇવ પ્રિવ્યુ
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 font-mono">
                  1086 × 1448 px
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Pan Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPanMode(!isPanMode)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    isPanMode
                      ? "bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-md"
                      : "bg-stone-800 text-stone-300 hover:text-amber-300 border-stone-700"
                  }`}
                  title={isPanMode ? "પૅન મોડ બંધ કરો (સ્ક્રોલ મુક્ત)" : "ફોટો ડ્રૅગ કરવા માટે ચાલુ કરો"}
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>{isPanMode ? "✋ પૅન સક્રિય" : "✋ ફોટો ખસેડો"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(true)}
                  className="text-xs text-stone-300 hover:text-amber-400 transition flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
                  title="Fullscreen Preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">મોટો પ્રિવ્યુ</span>
                </button>
              </div>
            </div>

            {/* Error Message if any */}
            {renderError && (
              <div className="mb-3 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs">
                {renderError}
              </div>
            )}

            {/* Canvas Container with responsive constraints */}
            <div
              className={`relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[440px] mx-auto aspect-[1086/1448] bg-stone-950 rounded-xl overflow-hidden shadow-2xl ring-1 ${
                isPanMode
                  ? "ring-2 ring-amber-500 touch-none cursor-grab active:cursor-grabbing"
                  : "ring-amber-500/20 touch-pan-y"
              } flex items-center justify-center select-none`}
              onMouseDown={(e) => {
                if (e.button === 0) handlePointerDown(e.clientX, e.clientY, false);
              }}
              onMouseMove={(e) => {
                if (e.buttons === 1) handlePointerMove(e.clientX, e.clientY, false);
              }}
              onMouseUp={handlePointerUp}
              onTouchStart={(e) => {
                if (isPanMode && e.touches[0]) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, true);
                }
              }}
              onTouchMove={(e) => {
                if (isPanMode && e.touches[0]) {
                  handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
                }
              }}
              onTouchEnd={handlePointerUp}
            >
              {/* Actual HTML Canvas for browser-side high-resolution rendering */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain pointer-events-none"
                width={POSTER_WIDTH}
                height={POSTER_HEIGHT}
              />

              {isPanMode && (
                <div className="absolute top-2 left-2 bg-amber-500 text-stone-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow pointer-events-none">
                  ✋ પૅન સક્રિય — ફોટો ખસેડો
                </div>
              )}

              {/* Initial Loading Indicator Only */}
              {isRendering && !cachedPhotoRef.current && (
                <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-amber-200 font-medium">પોસ્ટર તૈયાર થાય છે...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-5 space-y-3">
              {/* Prominent Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-base sm:text-lg text-stone-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-amber-300 hover:to-orange-300 active:scale-[0.99] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <Download className="w-5 h-5 text-stone-950 transition-transform group-hover:-translate-y-0.5" />
                <span>પોસ્ટર ડાઉનલોડ કરો (Download Poster PNG)</span>
              </button>

              {/* WhatsApp Quick Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppAction}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-green-300 bg-green-950/40 hover:bg-green-900/40 border border-green-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-green-400" />
                <span>વ્હોટ્સએપ પર શેર કરો (Share on WhatsApp)</span>
              </button>

              {/* Download Success Notice */}
              {downloadSuccess && (
                <div className="p-3 rounded-xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>
                    પોસ્ટર સફળતાપૂર્વક ડાઉનલોડ થયું! હવે વ્હોટ્સએપ ખોલી સ્ટેટસ અથવા ગ્રુપમાં મૂકો.
                  </span>
                </div>
              )}
            </div>

            {/* Instructions Callout */}
            <div className="mt-5 pt-4 border-t border-stone-800 text-xs text-stone-400 space-y-1.5">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p>
                  <strong className="text-stone-300">વર્કફ્લો:</strong> દરરોજ ફક્ત નવો ફોટો અપલોડ
                  કરો. તારીખ અને વાર આપમેળે ગણાઈ જશે. &apos;Download Poster&apos; દબાવીને સીધું વ્હોટ્સએપ
                  પર શેર કરો.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal Preview */}
      {isFullscreenPreview && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsFullscreenPreview(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsFullscreenPreview(false)}
              className="absolute -top-10 right-0 text-stone-300 hover:text-white text-sm font-semibold bg-stone-800 px-3 py-1 rounded-full border border-stone-700 cursor-pointer"
            >
              ✕ બંધ કરો
            </button>
            <div className="w-full aspect-[1086/1448] bg-stone-900 rounded-xl overflow-hidden shadow-2xl border border-stone-700">
              {canvasRef.current && (
                <img
                  src={canvasRef.current.toDataURL("image/png")}
                  alt="High Res Darshan Poster"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Temple Credits */}
      <footer className="mt-12 text-center text-xs text-stone-500 space-y-1 border-t border-stone-800/80 pt-6">
        <p className="font-gujarati text-stone-400">
          ॥ શ્રી હનુમાનજી મંદિર ટ્રસ્ટ, ડભોડા - ગાંધીનગર ॥
        </p>
        <p>Mo: 9091801818 • Social: @DABHODIYA_HANUMANJI_OFFICIAL</p>
        <p className="text-[11px] text-stone-600">
          100% Client-side HTML Canvas image processing. No user photos are ever stored on any server.
        </p>
      </footer>
    </div>
  );
}
