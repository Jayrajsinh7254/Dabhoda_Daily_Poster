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
  CheckCircle2,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Scissors,
  Clock,
  Flame,
  Info,
  Loader2,
  Download,
  Layout,
} from "lucide-react";
import {
  DEFAULT_TRANSFORM,
  ImageTransform,
  getKolkataDateInfo,
  loadImage,
} from "@/lib/poster-generator";
import {
  renderAartiFrame,
  recordAartiVideo,
  TEMPLATE_CANVAS_W,
  TEMPLATE_CANVAS_H,
  STORY_CANVAS_W,
  STORY_CANVAS_H,
  VideoLayoutMode,
} from "@/lib/video-generator";

const AARTI_PRESETS = [
  "મંગળાઆરતી",
  "શ્રૃંગાર આરતી",
  "રાજભોગ આરતી",
  "સંધ્યા આરતી",
  "શયન આરતી",
];

export default function AartiVideoGenerator() {
  // Layout mode: 'template' (Photo layout 1086×1448) or 'story_9_16' (464×832)
  const [layoutMode, setLayoutMode] = useState<VideoLayoutMode>("template");

  // Date state (live in Asia/Kolkata)
  const [dateInfo, setDateInfo] = useState(() => ({
    isoDate: "2026-10-23",
    displayDate: "23/10/2026",
    weekdayEnglish: "Friday",
    weekdayGujarati: "શુક્રવાર",
  }));
  const [customIsoDate, setCustomIsoDate] = useState("2026-10-23");
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Aarti state
  const [selectedAarti, setSelectedAarti] = useState<string>("મંગળાઆરતી");
  const [customAarti, setCustomAarti] = useState<string>("");
  const [isCustomAarti, setIsCustomAarti] = useState(false);

  // Video state
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Trim
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(15);

  // Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Transform
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_TRANSFORM);

  // Export state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [recordStatusText, setRecordStatusText] = useState<string>("");
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for assets and elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const idleImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const currentAartiText = isCustomAarti && customAarti.trim() ? customAarti.trim() : selectedAarti;

  // 1. Initialize Date & Preload Temple Assets
  useEffect(() => {
    try {
      const today = getKolkataDateInfo();
      setDateInfo(today);
      setCustomIsoDate(today.isoDate);
    } catch {
      /* fallback */
    }

    // Load authentic master template overlay (for Photo layout 1086×1448)
    loadImage("/assets/template-overlay.png")
      .then((img) => {
        overlayImgRef.current = img;
        drawCurrentFrame();
      })
      .catch((e) => console.warn("Template overlay load error:", e));

    // Load default idol for idle state
    loadImage("/assets/default-idol.jpg")
      .then((img) => {
        idleImgRef.current = img;
        drawCurrentFrame();
      })
      .catch((e) => console.warn("Default idol load error:", e));

    // Load logo image for story layout
    loadImage("/assets/daily-darshan-template.png")
      .then((img) => {
        logoImgRef.current = img;
        drawCurrentFrame();
      })
      .catch((e) => console.warn("Logo load error:", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    setCustomIsoDate(newIso);
    setIsCustomDate(true);
    setDateInfo(getKolkataDateInfo(newIso));
  };

  const handleResetDate = () => {
    const today = getKolkataDateInfo();
    setDateInfo(today);
    setCustomIsoDate(today.isoDate);
    setIsCustomDate(false);
  };

  // 2. Video metadata
  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = Math.max(1, vid.duration || 15);
    setVideoDuration(dur);
    setVideoResolution({ width: vid.videoWidth, height: vid.videoHeight });
    setStartTime(0);
    setEndTime(Math.min(dur, 15));
    vid.currentTime = 0;
    setCurrentTime(0);
    drawCurrentFrame();
  };

  // 3. File upload
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setDownloadSuccess(false);
    if (videoSrc?.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setVideoFileName(file.name);
    setTransform(DEFAULT_TRANSFORM);
    setIsPlaying(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  // 4. Draw frame
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const targetW = layoutMode === "template" ? TEMPLATE_CANVAS_W : STORY_CANVAS_W;
    const targetH = layoutMode === "template" ? TEMPLATE_CANVAS_H : STORY_CANVAS_H;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const vid = videoRef.current;
    renderAartiFrame(ctx, vid, overlayImgRef.current, {
      aartiName: currentAartiText,
      displayDate: dateInfo.displayDate,
      transform,
      layoutMode,
      logoImg: logoImgRef.current,
      idleImg: idleImgRef.current,
    });
  }, [currentAartiText, dateInfo.displayDate, transform, layoutMode]);

  // 5. Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      drawCurrentFrame();
      return;
    }
    const vid = videoRef.current;
    if (!vid) return;

    const loop = () => {
      if (!vid.paused && !vid.ended) {
        setCurrentTime(vid.currentTime);
        drawCurrentFrame();
        if (vid.currentTime >= endTime) vid.currentTime = startTime;
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, startTime, endTime, drawCurrentFrame]);

  useEffect(() => {
    if (!isPlaying) drawCurrentFrame();
  }, [currentAartiText, dateInfo.displayDate, transform, layoutMode, drawCurrentFrame, isPlaying]);

  // 6. Playback controls
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
        .catch(console.log);
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(vid.muted);
  };

  const applyDurationPreset = (seconds: number) => {
    const maxEnd = Math.min(videoDuration, startTime + seconds);
    setEndTime(maxEnd);
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      drawCurrentFrame();
    }
  };

  const handleZoom = (v: number) => setTransform((p) => ({ ...p, zoom: Math.max(0.5, Math.min(4.0, v)) }));
  const handleRotate = () => setTransform((p) => ({ ...p, rotation: ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270 }));
  const handleResetTransform = () => setTransform(DEFAULT_TRANSFORM);

  const handlePointerDown = (x: number, y: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x, y };
  };

  const handlePointerMove = (x: number, y: number) => {
    if (!isDraggingRef.current) return;
    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;
    dragStartRef.current = { x, y };
    const multiplier = layoutMode === "template" ? 3.0 : 2.0;
    setTransform((p) => ({ ...p, panX: p.panX + dx * multiplier, panY: p.panY + dy * multiplier }));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // 7. Export
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
      setRecordStatusText("વિડીયો રેકોર્ડિંગ શરૂ થઈ રહ્યું છે...");
      setErrorMessage(null);
      setDownloadSuccess(false);
      if (isPlaying) {
        vid.pause();
        setIsPlaying(false);
      }

      const result = await recordAartiVideo(
        canvas,
        vid,
        overlayImgRef.current,
        {
          aartiName: currentAartiText,
          displayDate: dateInfo.displayDate,
          transform,
          layoutMode,
          logoImg: logoImgRef.current,
          idleImg: idleImgRef.current,
        },
        startTime,
        endTime,
        (pct, cur, total) => {
          setRecordProgress(pct);
          setRecordStatusText(`${pct}% પૂર્ણ (${cur.toFixed(1)}s / ${total.toFixed(1)}s)`);
        }
      );

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDownloadSuccess(true);
      setIsRecording(false);
    } catch (err: any) {
      setErrorMessage(`ડાઉનલોડ ખામી: ${err?.message || "અજ્ઞાત ક્ષતિ"}`);
      setIsRecording(false);
    }
  };

  const selectedDuration = Math.max(0, endTime - startTime);
  const isTemplate = layoutMode === "template";
  const PREVIEW_W = isTemplate ? 310 : 270;
  const PREVIEW_H = isTemplate
    ? Math.round(PREVIEW_W * (TEMPLATE_CANVAS_H / TEMPLATE_CANVAS_W))
    : Math.round(PREVIEW_W * (STORY_CANVAS_H / STORY_CANVAS_W));

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
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

      {/* ═══ TOP: Layout Selector ═══ */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
          <Layout className="w-5 h-5 text-amber-500" />
          <span>પોસ્ટર લેઆઉટ પસંદ કરો:</span>
        </div>
        <div className="flex p-1 bg-stone-950 rounded-xl border border-stone-800 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setLayoutMode("template")}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isTemplate
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            🖼️ ફોટો જેવું પૂર્ણ પોસ્ટર (૧૦૮૬ × ૧૪૪૮)
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("story_9_16")}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isTemplate
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            📱 રીલ્સ / સ્ટોરી સાઇઝ (૪૬૪ × ૮૩૨)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ═══ LEFT: Controls ═══ */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. Upload */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500" />
                ૧. આજનો આરતી વિડીયો અપલોડ
              </h2>
              {videoFileName && (
                <span className="text-[10px] text-amber-300/80 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono max-w-[130px] truncate">
                  {videoFileName}
                </span>
              )}
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("aarti-video-upload-input")?.click()}
              className="border-2 border-dashed border-stone-700 hover:border-amber-500/70 hover:bg-stone-800/50 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center gap-2 group"
            >
              <input
                id="aarti-video-upload-input"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
              <div className="w-12 h-12 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-stone-200 font-medium text-sm">
                {videoFileName ? "વિડીયો બદલો" : "વિડીયો ફાઇલ અહીં ડ્રૅગ કરો અથવા ક્લિક કરો"}
              </p>
              <p className="text-stone-400 text-xs">MP4, MOV, WebM · ૧૫ – ૩૦ સેકન્ડ</p>
            </div>
            {videoFileName && (
              <div className="mt-2.5 flex items-center justify-between text-xs text-stone-400 bg-stone-950/60 p-2 rounded-lg border border-stone-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {videoDuration.toFixed(1)}s
                </span>
                <span className="font-mono">
                  {videoResolution.width}×{videoResolution.height}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  → {isTemplate ? "1086×1448" : "464×832"}
                </span>
              </div>
            )}
          </div>

          {/* 2. Duration Trimmer */}
          {videoSrc && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-500" />
                  ૨. ક્લિપ સમય મર્યાદા (15–30s)
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    selectedDuration <= 30
                      ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
                      : "bg-amber-950/70 border-amber-700/60 text-amber-300"
                  }`}
                >
                  {selectedDuration.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[15, 20, 30].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applyDurationPreset(s)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      Math.abs(selectedDuration - s) < 0.5
                        ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                        : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                    }`}
                  >
                    {s} સેકન્ડ
                  </button>
                ))}
              </div>
              {[
                {
                  label: "શરૂઆત (Start)",
                  val: startTime,
                  min: 0,
                  max: Math.max(0, videoDuration - 1),
                  onChange: (v: number) => {
                    setStartTime(v);
                    if (v >= endTime) setEndTime(Math.min(videoDuration, v + 15));
                    if (videoRef.current) {
                      videoRef.current.currentTime = v;
                      setCurrentTime(v);
                      drawCurrentFrame();
                    }
                  },
                },
                {
                  label: "સમાપ્તિ (End)",
                  val: endTime,
                  min: startTime + 1,
                  max: videoDuration,
                  onChange: (v: number) => {
                    setEndTime(v);
                    if (videoRef.current) {
                      videoRef.current.currentTime = v;
                      setCurrentTime(v);
                      drawCurrentFrame();
                    }
                  },
                },
              ].map(({ label, val, min, max, onChange }) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>{label}:</span>
                    <span className="font-mono text-amber-400">{val.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step="0.5"
                    value={val}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
              <div className="mt-2 bg-stone-950/50 p-2 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                WhatsApp સ્ટેટસ અને રીલ્સ માટે ૧૫–૩૦ સેકન્ડ શ્રેષ્ઠ છે.
              </div>
            </div>
          )}

          {/* 3. Aarti Type & Date */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              ૩. આરતી પ્રકાર અને તારીખ
            </h2>
            <label className="block text-xs font-medium text-stone-300 mb-2">આરતીનું નામ:</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {AARTI_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedAarti(p);
                    setIsCustomAarti(false);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    !isCustomAarti && selectedAarti === p
                      ? "bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400 shadow"
                      : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                  }`}
                >
                  {p === "મંગળાઆરતી" ? "🪔 " + p : p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomAarti(true)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  isCustomAarti
                    ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                અન્ય...
              </button>
            </div>
            {isCustomAarti && (
              <input
                type="text"
                value={customAarti}
                placeholder="આરતી / ઉત્સવ નામ દાખલ કરો..."
                onChange={(e) => setCustomAarti(e.target.value)}
                className="w-full mb-3 bg-stone-950 border border-amber-500/50 rounded-lg py-2 px-3 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            )}
            <div className="flex items-center justify-between text-xs text-stone-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-amber-400" />
                તારીખ:
              </span>
              {isCustomDate && (
                <button
                  onClick={handleResetDate}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> આજની તારીખ
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-950 border border-stone-800 rounded-lg py-1.5 px-3 font-mono font-bold text-amber-400 text-sm">
                {dateInfo.displayDate}
              </span>
              <input
                type="date"
                value={customIsoDate}
                onChange={handleDateChange}
                className="bg-stone-950 border border-stone-700 rounded-lg py-1.5 px-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Zoom & Position */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                ૪. ઝૂમ & ફ્રેમ એડજસ્ટ
              </h2>
              <button
                type="button"
                onClick={handleResetTransform}
                className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <ZoomOut className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.05"
                value={transform.zoom}
                onChange={(e) => handleZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-stone-700 rounded-lg cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="text-xs font-mono text-amber-400 w-12 text-right shrink-0">
                {Math.round(transform.zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="py-1.5 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded-lg text-xs font-medium text-stone-200 flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" /> ૯૦° ફેરવો
              </button>
              <p className="text-[11px] text-stone-400">પોસ્ટર પર ડ્રૅગ કરીને વિડીયો ખસેડો</p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Preview + Export ═══ */}
        <div className="lg:col-span-7 flex flex-col gap-5 items-center">
          {/* Live Preview card */}
          <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Preview ({isTemplate ? "1086 × 1448" : "464 × 832"})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-300 bg-stone-950 px-2 py-0.5 rounded border border-amber-800/40">
                  {isTemplate ? "૧૦૮૬×૧૪૪૮" : "૪૬૪×૮૩૨"}
                </span>
                {videoSrc && (
                  <>
                    <button
                      type="button"
                      onClick={toggleMute}
                      title={isMuted ? "અનમ્યૂટ કરો" : "મ્યૂટ કરો"}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-stone-300"
                    >
                      {isMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      title={isPlaying ? "રોકો" : "ચલાવો"}
                      className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-600/40 rounded-lg text-amber-300"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center py-1">
              <div
                className="relative cursor-crosshair rounded-xl overflow-hidden shadow-2xl ring-2 ring-amber-500/40 bg-stone-950"
                style={{ width: PREVIEW_W, height: PREVIEW_H }}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  handlePointerDown(t.clientX, t.clientY);
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0];
                  handlePointerMove(t.clientX, t.clientY);
                }}
                onTouchEnd={handlePointerUp}
              >
                <canvas
                  ref={canvasRef}
                  width={isTemplate ? TEMPLATE_CANVAS_W : STORY_CANVAS_W}
                  height={isTemplate ? TEMPLATE_CANVAS_H : STORY_CANVAS_H}
                  style={{ width: PREVIEW_W, height: PREVIEW_H, display: "block" }}
                />
                {!videoSrc && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                    <span className="bg-stone-900/90 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full shadow-lg backdrop-blur-sm">
                      🎬 વિડીયો અપલોડ કરો
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Seek bar */}
            {videoSrc && videoDuration > 0 && (
              <div className="mt-3">
                <input
                  type="range"
                  min={startTime}
                  max={endTime}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.currentTime = t;
                      setCurrentTime(t);
                      drawCurrentFrame();
                    }
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500 mt-0.5 font-mono">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{endTime.toFixed(1)}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Export card */}
          <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-amber-400 font-semibold text-sm flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-amber-500" />
              ૫. વિડીયો ડાઉનલોડ કરો ({isTemplate ? "1086 × 1448" : "464 × 832"})
            </h2>

            {errorMessage && (
              <div className="mb-3 bg-red-950/60 border border-red-700/60 text-red-300 text-xs rounded-lg p-3">
                ⚠️ {errorMessage}
              </div>
            )}
            {downloadSuccess && (
              <div className="mb-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                સફળતાપૂર્વક ડાઉનલોડ થયું! WhatsApp Status / Reel માટે તૈયાર છે. 🙏
              </div>
            )}
            {isRecording && (
              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs text-amber-300 mb-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {recordStatusText}
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-stone-400 mt-0.5">{recordProgress}%</div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isRecording || !videoSrc}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isRecording || !videoSrc
                  ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 via-amber-500 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> ડાઉનલોડ તૈયાર થઈ રહ્યું છે...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> 🎬 Export{" "}
                  {isTemplate ? "1086×1448 મંદિર પોસ્ટર વિડીયો" : "464×832 રીલ્સ વિડીયો"}
                </>
              )}
            </button>
            <p className="mt-2 text-[11px] text-stone-500 text-center">
              {selectedDuration.toFixed(0)} સેકન્ડ · {isTemplate ? "1086×1448 px" : "464×832 px"} · ઑડિયો સાથે · WhatsApp Status / Reels
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
