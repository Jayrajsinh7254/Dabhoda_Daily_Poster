"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  Video,
  Play,
  Pause,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Calendar,
  Share2,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Sliders,
  Volume2,
  VolumeX,
  Scissors,
  Clock,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
  Loader2,
  Film,
} from "lucide-react";
import {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  DEFAULT_TRANSFORM,
  ImageTransform,
  getKolkataDateInfo,
  loadImage,
} from "@/lib/poster-generator";
import {
  VideoLayoutMode,
  renderAartiFrame,
  recordAartiVideo,
} from "@/lib/video-generator";

const AARTI_PRESETS = [
  "મંગળાઆરતી",
  "શ્રૃંગાર આરતી",
  "રાજભોગ આરતી",
  "સંધ્યા આરતી",
  "શયન આરતી",
];

export default function AartiVideoGenerator() {
  // Current date info in Asia/Kolkata
  const [dateInfo, setDateInfo] = useState(() => ({
    isoDate: "2026-10-23",
    displayDate: "23/10/2026",
    weekdayEnglish: "Friday",
    weekdayGujarati: "શુક્રવાર",
  }));
  const [customIsoDate, setCustomIsoDate] = useState("2026-10-23");
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Aarti Name state - Default is user-requested "મંગળાઆરતી"
  const [selectedAarti, setSelectedAarti] = useState<string>("મંગળાઆરતી");
  const [customAarti, setCustomAarti] = useState<string>("");
  const [isCustomAarti, setIsCustomAarti] = useState(false);

  // Layout Mode: 'template' (Classic 1086x1448) or 'story_9_16' (1080x1920)
  const [layoutMode, setLayoutMode] = useState<VideoLayoutMode>("template");

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Trimming State (15 to 30 secs)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(15);

  // Video Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Framing & Alignment
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_TRANSFORM);

  // Rendering & Export State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [recordStatusText, setRecordStatusText] = useState<string>("");
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreenModal, setIsFullscreenModal] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedOverlayRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Direct canvas drag & pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 1. Initialize Asia/Kolkata live date on mount
  useEffect(() => {
    try {
      const today = getKolkataDateInfo();
      setDateInfo(today);
      setCustomIsoDate(today.isoDate);
    } catch {
      // Fallback
    }
  }, []);

  // 2. Preload template overlay
  useEffect(() => {
    loadImage("/assets/template-overlay.png")
      .then((img) => {
        cachedOverlayRef.current = img;
        drawCurrentFrame();
      })
      .catch((err) => {
        console.error("Failed to preload template overlay:", err);
      });
  }, []);

  // 3. Update date override
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    setCustomIsoDate(newIso);
    setIsCustomDate(true);
    const updated = getKolkataDateInfo(newIso);
    setDateInfo(updated);
  };

  const handleResetDate = () => {
    const today = getKolkataDateInfo();
    setDateInfo(today);
    setCustomIsoDate(today.isoDate);
    setIsCustomDate(false);
  };

  // Active Aarti text
  const currentAartiText = isCustomAarti && customAarti.trim() ? customAarti.trim() : selectedAarti;

  // 4. Video metadata loaded
  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const dur = Math.max(1, vid.duration || 15);
    setVideoDuration(dur);
    setVideoResolution({ width: vid.videoWidth, height: vid.videoHeight });

    // Set smart default duration: 15 seconds or video length if shorter
    const defaultEnd = Math.min(dur, 15);
    setStartTime(0);
    setEndTime(defaultEnd);
    vid.currentTime = 0;
    setCurrentTime(0);

    drawCurrentFrame();
  };

  // 5. Video File Upload Handler
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setDownloadSuccess(false);

    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setVideoFileName(file.name);
    setTransform(DEFAULT_TRANSFORM);
    setIsPlaying(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 6. Draw current frame onto canvas
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const vid = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const targetWidth = layoutMode === "template" ? POSTER_WIDTH : 1080;
    const targetHeight = layoutMode === "template" ? POSTER_HEIGHT : 1920;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    if (vid && vid.readyState >= 2) {
      renderAartiFrame(ctx, vid, cachedOverlayRef.current, {
        aartiName: currentAartiText,
        displayDate: dateInfo.displayDate,
        transform,
        layoutMode,
      });
    } else {
      // Idle / placeholder state when no video is loaded yet
      renderIdleState(ctx, targetWidth, targetHeight);
    }
  }, [layoutMode, currentAartiText, dateInfo.displayDate, transform]);

  // Idle state illustration when waiting for video
  const renderIdleState = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, w, h);

    if (layoutMode === "template" && cachedOverlayRef.current) {
      ctx.drawImage(cachedOverlayRef.current, 0, 0, w, h);

      // Render date
      ctx.fillStyle = "#16161b";
      ctx.font = "bold 32px 'Georgia', serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(dateInfo.displayDate, 542, 1196);

      // Render aarti
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px 'Noto Sans Gujarati', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 3;
      ctx.fillText(currentAartiText, 552, 1251);
    }
  };

  // 7. Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      drawCurrentFrame();
      return;
    }

    const vid = videoRef.current;
    if (!vid) return;

    const loop = () => {
      if (!vid.paused && !vid.ended) {
        setCurrentTime(vid.currentTime);
        drawCurrentFrame();

        // Loop within trim range
        if (vid.currentTime >= endTime) {
          vid.currentTime = startTime;
        }

        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, startTime, endTime, drawCurrentFrame]);

  // 8. Player Controls
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (vid.currentTime < startTime || vid.currentTime >= endTime) {
        vid.currentTime = startTime;
      }
      vid.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.log("Play interrupted:", err));
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(vid.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = newTime;
    setCurrentTime(newTime);
    drawCurrentFrame();
  };

  // Quick duration presets
  const applyDurationPreset = (seconds: number) => {
    const maxEnd = Math.min(videoDuration, startTime + seconds);
    setEndTime(maxEnd);
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      drawCurrentFrame();
    }
  };

  // Transform controls
  const handleZoom = (newZoom: number) => {
    const clamped = Math.max(0.8, Math.min(3.0, newZoom));
    setTransform((prev) => ({ ...prev, zoom: clamped }));
  };

  const handleRotate = () => {
    setTransform((prev) => ({
      ...prev,
      rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270,
    }));
  };

  const handlePan = (dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  };

  const handleResetTransform = () => {
    setTransform(DEFAULT_TRANSFORM);
  };

  // Direct Drag & Pan on Preview Canvas
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    dragStartRef.current = { x: clientX, y: clientY };
    setTransform((prev) => ({
      ...prev,
      panX: prev.panX + dx * 2,
      panY: prev.panY + dy * 2,
    }));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // 9. Video Export Engine
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    const vid = videoRef.current;
    if (!canvas || !vid) {
      setErrorMessage("કૃપા કરીને પહેલા આરતી વિડીયો અપલોડ કરો.");
      return;
    }

    try {
      setIsRecording(true);
      setRecordProgress(0);
      setRecordStatusText("વિડીયો તૈયાર કરી રહ્યા છીએ...");
      setErrorMessage(null);
      setDownloadSuccess(false);

      if (isPlaying) {
        vid.pause();
        setIsPlaying(false);
      }

      const totalTrimSeconds = Math.max(1, endTime - startTime);

      const result = await recordAartiVideo(
        canvas,
        vid,
        cachedOverlayRef.current,
        {
          aartiName: currentAartiText,
          displayDate: dateInfo.displayDate,
          transform,
          layoutMode,
        },
        startTime,
        endTime,
        (pct, curSec, totalSec) => {
          setRecordProgress(pct);
          setRecordStatusText(
            `રેન્ડર થઈ રહ્યું છે... ${pct}% (${curSec.toFixed(1)}s / ${totalSec.toFixed(1)}s)`
          );
        }
      );

      // Trigger high-quality video download
      const downloadUrl = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

      setDownloadSuccess(true);
      setIsRecording(false);
    } catch (err: any) {
      console.error("Video export failed:", err);
      setErrorMessage(`વિડીયો ડાઉનલોડ કરવામાં ખામી આવી: ${err?.message || "અજ્ઞાત ભૂલ"}`);
      setIsRecording(false);
    }
  };

  const selectedDuration = Math.max(0, endTime - startTime);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Hidden processing video element */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          muted={isMuted}
          crossOrigin="anonymous"
          onLoadedMetadata={handleVideoLoadedMetadata}
          className="hidden"
        />
      )}

      {/* Main Grid: Left Controls, Right Live Video Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Controls, Trimmer, Formatting */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Card 1: Video Upload */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500" />
                ૧. આજનો આરતી વિડીયો અપલોડ કરો
              </h2>
              {videoFileName && (
                <span className="text-[11px] text-amber-300/80 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono max-w-[140px] truncate">
                  {videoFileName}
                </span>
              )}
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("aarti-video-upload-input")?.click()}
              className="border-2 border-dashed border-stone-700 hover:border-amber-500/70 hover:bg-stone-800/50 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group"
            >
              <input
                id="aarti-video-upload-input"
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-all">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-stone-200 font-medium text-sm sm:text-base">
                {videoFileName ? "વિડીયો બદલવા અહીં ક્લિક કરો" : "આરતી વિડીયો પસંદ કરો અથવા ડ્રેગ કરો"}
              </p>
              <p className="text-stone-400 text-xs">
                MP4, MOV, WebM (મોબાઈલ કેમેરાથી રેકોર્ડ કરેલ વિડીયો)
              </p>
            </div>

            {videoFileName && (
              <div className="mt-3 flex items-center justify-between text-xs text-stone-400 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  કુલ લંબાઈ: {videoDuration.toFixed(1)} સેકન્ડ
                </span>
                <span className="font-mono text-stone-300">
                  {videoResolution.width}×{videoResolution.height}
                </span>
              </div>
            )}
          </div>

          {/* Card 2: 15 to 30 Seconds Duration Trimmer */}
          {videoSrc && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-500" />
                  ૨. વિડીયો લંબાઈ (૧૫ થી ૩૦ સેકન્ડ)
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  selectedDuration <= 30
                    ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
                    : "bg-amber-950/70 border-amber-700/60 text-amber-300"
                }`}>
                  {selectedDuration.toFixed(1)}s પસંદિત
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => applyDurationPreset(15)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    Math.abs(selectedDuration - 15) < 0.5
                      ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md"
                      : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                  }`}
                >
                  ⚡ ૧૫ સેકન્ડ
                </button>
                <button
                  type="button"
                  onClick={() => applyDurationPreset(30)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    Math.abs(selectedDuration - 30) < 0.5
                      ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md"
                      : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                  }`}
                >
                  📱 ૩૦ સેકન્ડ (Status)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(videoDuration, 30));
                  }}
                  className="py-2 px-3 rounded-lg text-xs font-semibold bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750 transition-all"
                >
                  🎬 શરૂઆતથી ૩૦સે
                </button>
              </div>

              {/* Range sliders */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>શરૂઆતનો સમય (Start):</span>
                    <span className="font-mono text-amber-400">{startTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, videoDuration - 1)}
                    step="0.5"
                    value={startTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStartTime(val);
                      if (val >= endTime) {
                        setEndTime(Math.min(videoDuration, val + 15));
                      }
                      if (videoRef.current) {
                        videoRef.current.currentTime = val;
                        setCurrentTime(val);
                        drawCurrentFrame();
                      }
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>અંતિમ સમય (End):</span>
                    <span className="font-mono text-amber-400">{endTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={startTime + 1}
                    max={videoDuration}
                    step="0.5"
                    value={endTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEndTime(val);
                      if (videoRef.current) {
                        videoRef.current.currentTime = val;
                        setCurrentTime(val);
                        drawCurrentFrame();
                      }
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-3 bg-stone-950/50 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>વ્હોટ્સએપ સ્ટેટસ માટે ૧૫ થી ૩૦ સેકન્ડનો વિડીયો શ્રેષ્ઠ રહે છે.</span>
              </div>
            </div>
          )}

          {/* Card 3: Aarti Type & Date Selection */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              ૩. આરતી પ્રકાર અને તારીખ
            </h2>

            {/* Aarti Presets */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-300 mb-2">
                આરતી પ્રકાર પસંદ કરો:
              </label>
              <div className="flex flex-wrap gap-2">
                {AARTI_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedAarti(preset);
                      setIsCustomAarti(false);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border ${
                      !isCustomAarti && selectedAarti === preset
                        ? "bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400 shadow-md ring-1 ring-amber-400/50"
                        : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                    }`}
                  >
                    {preset === "મંગળાઆરતી" ? "🪔 મંગળાઆરતી" : preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomAarti(true)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    isCustomAarti
                      ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                      : "bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750"
                  }`}
                >
                  અન્ય લખો...
                </button>
              </div>

              {isCustomAarti && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customAarti}
                    placeholder="આરતી અથવા ઉત્સવનું નામ લખો..."
                    onChange={(e) => setCustomAarti(e.target.value)}
                    className="w-full bg-stone-950 border border-amber-500/50 rounded-lg py-2 px-3 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Layout Style Toggle */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-300 mb-2">
                વિડીયો ફ્રેમ સ્ટાઈલ:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutMode("template")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    layoutMode === "template"
                      ? "bg-amber-500/10 border-amber-500 text-amber-200 ring-1 ring-amber-500/40"
                      : "bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800"
                  }`}
                >
                  <span className="font-semibold text-xs text-stone-200">શાસ્ત્રીય મંદિર ફ્રેમ</span>
                  <span className="text-[10px] text-stone-400">1086 × 1448 (પોસ્ટર જેવી ફ્રેમ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("story_9_16")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    layoutMode === "story_9_16"
                      ? "bg-amber-500/10 border-amber-500 text-amber-200 ring-1 ring-amber-500/40"
                      : "bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800"
                  }`}
                >
                  <span className="font-semibold text-xs text-stone-200">ફુલ-સ્ક્રીન સ્ટેટસ</span>
                  <span className="text-[10px] text-stone-400">1080 × 1920 (9:16 રીલ/સ્ટેટસ)</span>
                </button>
              </div>
            </div>

            {/* Date Display and Override */}
            <div>
              <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  તારીખ (Date):
                </span>
                {isCustomDate && (
                  <button
                    onClick={handleResetDate}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    આજની તારીખ કરો
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 font-mono font-bold text-amber-400 text-sm">
                  {dateInfo.displayDate}
                </div>
                <input
                  type="date"
                  value={customIsoDate}
                  onChange={handleDateChange}
                  className="bg-stone-950 border border-stone-700 rounded-lg py-1.5 px-2.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Video Framing & Zoom */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                ૪. વિડીયો એડજસ્ટમેન્ટ (Zoom & Position)
              </h2>
              <button
                type="button"
                onClick={handleResetTransform}
                className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                રીસેટ
              </button>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-3 mb-4">
              <ZoomOut className="w-4 h-4 text-stone-400" />
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.05"
                value={transform.zoom}
                onChange={(e) => handleZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-stone-750 rounded-lg cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-mono text-amber-400 w-12 text-right">
                {Math.round(transform.zoom * 100)}%
              </span>
            </div>

            {/* Pan & Rotate */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleRotate}
                className="py-2 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded-xl text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-all"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                ૯૦° ફેરવો ({transform.rotation}°)
              </button>

              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => handlePan(-15, 0)}
                  className="p-1.5 text-stone-300 hover:text-amber-400 hover:bg-stone-850 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePan(0, -15)}
                  className="p-1.5 text-stone-300 hover:text-amber-400 hover:bg-stone-850 rounded"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePan(0, 15)}
                  className="p-1.5 text-stone-300 hover:text-amber-400 hover:bg-stone-850 rounded"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePan(15, 0)}
                  className="p-1.5 text-stone-300 hover:text-amber-400 hover:bg-stone-850 rounded"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 mt-2">
              💡 ટીપ: વિડીયોને સ્ક્રીન પર સીધો ટચ અથવા ડ્રેગ કરીને પણ ખસેડી શકો છો.
            </p>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Live Interactive Video & Poster Canvas */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Preview Container Header */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm sm:text-base font-semibold text-stone-100">
                  લાઈવ વિડીયો પ્રિવ્યુ (Live Aarti Preview)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-stone-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                  {layoutMode === "template" ? "1086 × 1448" : "1080 × 1920"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullscreenModal(true)}
                  className="p-1.5 text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-all"
                  title="મોટો પ્રિવ્યુ"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Canvas Container with interactive touch/mouse drag */}
            <div
              className="relative w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex items-center justify-center cursor-move select-none shadow-2xl"
              style={{ maxHeight: "72vh" }}
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[70vh] object-contain block mx-auto transition-transform"
              />

              {!videoSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-950/80 backdrop-blur-sm pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <Video className="w-8 h-8" />
                  </div>
                  <h3 className="text-amber-300 font-bold text-base sm:text-lg mb-1">
                    આરતી વિડીયો અપલોડ કરો
                  </h3>
                  <p className="text-stone-400 text-xs sm:text-sm max-w-sm">
                    ડાબી બાજુથી ૧૫ થી ૩૦ સેકન્ડનો મંગળા આરતી વિડીયો પસંદ કરો અને સીધો વ્હોટ્સએપ માટે તૈયાર કરો.
                  </p>
                </div>
              )}
            </div>

            {/* Live Playback Controls */}
            {videoSrc && (
              <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-2.5 rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400 transition-all shadow-md shrink-0"
                    title={isPlaying ? "પોઝ કરો" : "પ્લે કરો"}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-all shrink-0"
                    title={isMuted ? "અનમ્યુટ કરો" : "મ્યુટ કરો"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                  </button>

                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={startTime}
                      max={endTime}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-amber-500 h-2 bg-stone-750 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-stone-400 shrink-0 w-16 text-right">
                      {(currentTime - startTime).toFixed(1)}s / {selectedDuration.toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Success Banner */}
            {downloadSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  આરતી વિડીયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગયો છે!
                </span>
                <span className="text-emerald-400 font-semibold">વ્હોટ્સએપ પર શેર કરવા તૈયાર</span>
              </div>
            )}

            {/* Export & Download Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isRecording || !videoSrc}
                className={`w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                  isRecording || !videoSrc
                    ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-stone-950 hover:brightness-110 active:scale-[0.99] border border-amber-300"
                }`}
              >
                {isRecording ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span>{recordStatusText}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 fill-current" />
                    <span>આરતી વિડીયો ડાઉનલોડ કરો (Download Aarti Video)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `શ્રી ડભોડીયા હનુમાનજી મંદિર - ડભોડા\nઆજ ની ${currentAartiText}\nતારીખ: ${dateInfo.displayDate}\nજય શ્રી રામ • જય શ્રી હનુમાન`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-900/60 hover:bg-emerald-800/70 text-emerald-200 border border-emerald-700/60 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                વ્હોટ્સએપ પર શેર કરો (Share on WhatsApp)
              </button>
            </div>

            {/* Informational Footer Tip */}
            <div className="text-[11px] text-stone-400 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>દરરોજનો વર્કફ્લો:</strong> મંદિરની મંગળા આરતીનો ૧૫ થી ૩૦ સેકન્ડનો વિડીયો અપલોડ કરો. તારીખ અને મંગળાઆરતી આપમેળે સેટ થઈ જશે. ડાઉનલોડ કરીને સીધું વ્હોટ્સએપ સ્ટેટસ અથવા રીલ્સમાં શેર કરો.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Fullscreen Video Preview Modal */}
      {isFullscreenModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsFullscreenModal(false)}
        >
          <div className="relative max-w-2xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsFullscreenModal(false)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-stone-800 hover:bg-stone-700 px-3 py-1 rounded-full"
            >
              બંધ કરો (Close) ✕
            </button>
            <canvas
              ref={(modalCanvas) => {
                if (modalCanvas && canvasRef.current) {
                  modalCanvas.width = canvasRef.current.width;
                  modalCanvas.height = canvasRef.current.height;
                  const ctx = modalCanvas.getContext("2d");
                  if (ctx) ctx.drawImage(canvasRef.current, 0, 0);
                }
              }}
              className="max-h-[82vh] w-auto object-contain rounded-xl shadow-2xl border border-amber-500/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
