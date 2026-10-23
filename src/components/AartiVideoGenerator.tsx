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
} from "lucide-react";
import {
  DEFAULT_TRANSFORM,
  ImageTransform,
  getKolkataDateInfo,
} from "@/lib/poster-generator";
import {
  VideoLayoutMode,
  renderAartiFrame,
  recordAartiVideo,
  AARTI_CANVAS_W,
  AARTI_CANVAS_H,
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

  // Aarti Name state
  const [selectedAarti, setSelectedAarti] = useState<string>("મંગળાઆરતી");
  const [customAarti, setCustomAarti] = useState<string>("");
  const [isCustomAarti, setIsCustomAarti] = useState(false);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Trimming State
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

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Drag & Pan state
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

  // 2. Date override handler
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

  // 3. Video metadata loaded
  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = Math.max(1, vid.duration || 15);
    setVideoDuration(dur);
    setVideoResolution({ width: vid.videoWidth, height: vid.videoHeight });
    const defaultEnd = Math.min(dur, 15);
    setStartTime(0);
    setEndTime(defaultEnd);
    vid.currentTime = 0;
    setCurrentTime(0);
    drawCurrentFrame();
  };

  // 4. Video File Upload Handler
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

  // 5. Draw current frame onto canvas
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Always 464 × 832
    if (canvas.width !== AARTI_CANVAS_W || canvas.height !== AARTI_CANVAS_H) {
      canvas.width = AARTI_CANVAS_W;
      canvas.height = AARTI_CANVAS_H;
    }

    const vid = videoRef.current;
    if (vid && vid.readyState >= 2) {
      renderAartiFrame(ctx, vid, null, {
        aartiName: currentAartiText,
        displayDate: dateInfo.displayDate,
        transform,
        layoutMode: "template",
      });
    } else {
      renderIdleState(ctx);
    }
  }, [currentAartiText, dateInfo.displayDate, transform]);

  // Idle placeholder state
  const renderIdleState = (ctx: CanvasRenderingContext2D) => {
    const W = AARTI_CANVAS_W;
    const H = AARTI_CANVAS_H;

    // Gradient placeholder background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1c0d02');
    bg.addColorStop(0.5, '#2d1505');
    bg.addColorStop(1, '#0f0804');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Decorative flame icon in center
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '64px serif';
    ctx.globalAlpha = 0.35;
    ctx.fillText('🪔', W / 2, H / 2 - 30);
    ctx.globalAlpha = 1;

    ctx.font = "bold 15px 'Outfit', sans-serif";
    ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.fillText('આરતી વિડીયો અપલોડ કરો', W / 2, H / 2 + 40);
    ctx.restore();

    // Draw overlays with placeholder data
    renderOverlays(ctx, currentAartiText, dateInfo.displayDate);
  };

  // Draw the text & UI overlays (used both live and idle)
  const renderOverlays = (ctx: CanvasRenderingContext2D, aartiName: string, displayDate: string) => {
    const W = AARTI_CANVAS_W;
    const H = AARTI_CANVAS_H;

    // Top gradient
    const topGrad = ctx.createLinearGradient(0, 0, 0, 160);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    topGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.38)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 160);

    // Bottom gradient
    const bottomGrad = ctx.createLinearGradient(0, H - 200, 0, H);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, H - 200, W, 200);

    // Top title
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = "bold 26px 'Georgia', serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(aartiName, 16, 20);
    ctx.font = "bold 18px 'Georgia', serif";
    ctx.fillStyle = '#fde68a';
    ctx.shadowBlur = 6;
    ctx.fillText(displayDate, 16, 52);
    ctx.restore();

    // Handle
    ctx.save();
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    ctx.font = "600 13px 'Outfit', 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 5;
    ctx.fillText('@dabhodiyahanumanji_official', W / 2, H - 168);
    ctx.restore();

    // Date pill
    const pillW = W - 32;
    const pillH = 42;
    const pillX = 16;
    const pillY = H - 158;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pillX, pillY, pillW, pillH, 10);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = 'rgba(251, 191, 36, 0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fill();

    // Calendar icon box
    const iconX = pillX + 12;
    const iconY = pillY + 8;
    const iconSize = 26;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(iconX, iconY, iconSize, iconSize, 4);
    } else {
      ctx.rect(iconX, iconY, iconSize, iconSize);
    }
    ctx.fill();

    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(iconX + 4, iconY + 9);
    ctx.lineTo(iconX + iconSize - 4, iconY + 9);
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    [[8, 16], [13, 16], [18, 16]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(iconX + dx, iconY + dy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Date text
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = "bold 17px 'Georgia', serif";
    ctx.fillStyle = '#1c1917';
    ctx.fillText(`તારીખ : ${displayDate}`, iconX + iconSize + 10, pillY + pillH / 2);
    ctx.restore();

    // Red ribbon aarti name
    const ribbonY = H - 110;
    const ribbonH = 48;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, ribbonY, W, ribbonH);
    const ribbonGrad = ctx.createLinearGradient(0, ribbonY, W, ribbonY);
    ribbonGrad.addColorStop(0, '#7f1d1d');
    ribbonGrad.addColorStop(0.3, '#dc2626');
    ribbonGrad.addColorStop(0.7, '#dc2626');
    ribbonGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = ribbonGrad;
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ribbonY);
    ctx.lineTo(W, ribbonY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, ribbonY + ribbonH);
    ctx.lineTo(W, ribbonY + ribbonH);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "bold 22px 'Noto Sans Gujarati', 'Shruti', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`🪔 ${aartiName}`, W / 2, ribbonY + ribbonH / 2);
    ctx.restore();

    // Gold border
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
    ctx.restore();
  };

  // 6. Playback animation loop
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
        if (vid.currentTime >= endTime) {
          vid.currentTime = startTime;
        }
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isPlaying, startTime, endTime, drawCurrentFrame]);

  // Redraw when settings change
  useEffect(() => {
    if (!isPlaying) drawCurrentFrame();
  }, [currentAartiText, dateInfo.displayDate, transform, drawCurrentFrame, isPlaying]);

  // Init canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = AARTI_CANVAS_W;
      canvas.height = AARTI_CANVAS_H;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) renderIdleState(ctx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 7. Player Controls
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
    const clamped = Math.max(0.5, Math.min(4.0, newZoom));
    setTransform((prev) => ({ ...prev, zoom: clamped }));
  };

  const handleRotate = () => {
    setTransform((prev) => ({
      ...prev,
      rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270,
    }));
  };

  const handleResetTransform = () => setTransform(DEFAULT_TRANSFORM);

  // Drag pan on canvas
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
  const handlePointerUp = () => { isDraggingRef.current = false; };

  // 8. Video Export Engine
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
      if (isPlaying) { vid.pause(); setIsPlaying(false); }
      const result = await recordAartiVideo(
        canvas, vid, null,
        { aartiName: currentAartiText, displayDate: dateInfo.displayDate, transform, layoutMode: "template" },
        startTime, endTime,
        (pct, curSec, totalSec) => {
          setRecordProgress(pct);
          setRecordStatusText(`રેન્ડર... ${pct}% (${curSec.toFixed(1)}s / ${totalSec.toFixed(1)}s)`);
        }
      );
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
      setErrorMessage(`વિડીયો ડાઉનલોડ ખામી: ${err?.message || "અજ્ઞાત ભૂલ"}`);
      setIsRecording(false);
    }
  };

  const selectedDuration = Math.max(0, endTime - startTime);

  // Canvas display scale (fit preview in UI)
  const PREVIEW_W = 290; // px shown in UI
  const PREVIEW_H = Math.round(PREVIEW_W * (AARTI_CANVAS_H / AARTI_CANVAS_W));

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ═══ LEFT COLUMN: Controls ═══ */}
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
                onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              />
              <div className="w-14 h-14 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-all">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-stone-200 font-medium text-sm sm:text-base">
                {videoFileName ? "વિડીયો બદલવા અહીં ક્લિક કરો" : "આરતી વિડીયો પસંદ કરો અથવા ડ્રેગ કરો"}
              </p>
              <p className="text-stone-400 text-xs">MP4, MOV, WebM · ૧૫ – ૩૦ સેકન્ડ</p>
            </div>

            {videoFileName && (
              <div className="mt-3 flex items-center justify-between text-xs text-stone-400 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  કુલ: {videoDuration.toFixed(1)}s
                </span>
                <span className="font-mono text-stone-300">{videoResolution.width}×{videoResolution.height}</span>
                <span className="font-mono text-amber-400 font-bold">→ 464×832 px</span>
              </div>
            )}
          </div>

          {/* Card 2: Duration Trimmer */}
          {videoSrc && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-500" />
                  ૨. વિડીયો ક્લિપ (૧૫–૩૦ સેકન્ડ)
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  selectedDuration <= 30
                    ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
                    : "bg-amber-950/70 border-amber-700/60 text-amber-300"
                }`}>
                  {selectedDuration.toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[15, 20, 30].map((sec) => (
                  <button key={sec} type="button" onClick={() => applyDurationPreset(sec)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      Math.abs(selectedDuration - sec) < 0.5
                        ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md"
                        : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                    }`}>
                    {sec}s
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>Start:</span>
                    <span className="font-mono text-amber-400">{startTime.toFixed(1)}s</span>
                  </div>
                  <input type="range" min="0" max={Math.max(0, videoDuration - 1)} step="0.5"
                    value={startTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStartTime(val);
                      if (val >= endTime) setEndTime(Math.min(videoDuration, val + 15));
                      if (videoRef.current) {
                        videoRef.current.currentTime = val;
                        setCurrentTime(val);
                        drawCurrentFrame();
                      }
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>End:</span>
                    <span className="font-mono text-amber-400">{endTime.toFixed(1)}s</span>
                  </div>
                  <input type="range" min={startTime + 1} max={videoDuration} step="0.5"
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
                    className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer" />
                </div>
              </div>

              <div className="mt-3 bg-stone-950/50 p-2.5 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>WhatsApp Status / Reel માટે ૧૫–૩૦ સેકન્ડ.</span>
              </div>
            </div>
          )}

          {/* Card 3: Aarti Type & Date */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              ૩. આરતી પ્રકાર અને તારીખ
            </h2>

            {/* Aarti Presets */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-300 mb-2">આરતી પ્રકાર:</label>
              <div className="flex flex-wrap gap-2">
                {AARTI_PRESETS.map((preset) => (
                  <button key={preset} type="button"
                    onClick={() => { setSelectedAarti(preset); setIsCustomAarti(false); }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border ${
                      !isCustomAarti && selectedAarti === preset
                        ? "bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400 shadow-md"
                        : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                    }`}>
                    {preset === "મંગળાઆરતી" ? "🪔 મંગળાઆરતી" : preset}
                  </button>
                ))}
                <button type="button" onClick={() => setIsCustomAarti(true)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    isCustomAarti ? "bg-amber-500 text-stone-950 border-amber-400" : "bg-stone-800 text-stone-400 border-stone-700"
                  }`}>
                  અન્ય...
                </button>
              </div>
              {isCustomAarti && (
                <input type="text" value={customAarti}
                  placeholder="આરતી / ઉત્સવ નામ..."
                  onChange={(e) => setCustomAarti(e.target.value)}
                  className="mt-2.5 w-full bg-stone-950 border border-amber-500/50 rounded-lg py-2 px-3 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              )}
            </div>

            {/* Date Display */}
            <div>
              <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  તારીખ:
                </span>
                {isCustomDate && (
                  <button onClick={handleResetDate} className="text-[11px] text-amber-400 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> આજ
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 font-mono font-bold text-amber-400 text-sm">
                  {dateInfo.displayDate}
                </div>
                <input type="date" value={customIsoDate} onChange={handleDateChange}
                  className="bg-stone-950 border border-stone-700 rounded-lg py-1.5 px-2.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Card 4: Video Adjustment */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                ૪. ઝૂમ & ફ્રેમ એડજસ્ટ
              </h2>
              <button type="button" onClick={handleResetTransform}
                className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-all">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <ZoomOut className="w-4 h-4 text-stone-400" />
              <input type="range" min="0.5" max="4.0" step="0.05"
                value={transform.zoom}
                onChange={(e) => handleZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-stone-750 rounded-lg cursor-pointer" />
              <ZoomIn className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-mono text-amber-400 w-12 text-right">{Math.round(transform.zoom * 100)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={handleRotate}
                className="py-2 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded-xl text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-all">
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                ૯૦° ફેરવો
              </button>
              <div className="text-[11px] text-stone-400 bg-stone-950/50 border border-stone-800 rounded-lg px-2 py-1 flex-1 text-center">
                પ્રિવ્યૂ ઉપર ડ્રેગ કરી પોઝિશન બદલો
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Live Preview + Export ═══ */}
        <div className="lg:col-span-7 flex flex-col gap-5 items-center">

          {/* Preview Header */}
          <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Preview
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-amber-300 bg-stone-950 px-2 py-0.5 rounded border border-amber-800/40">
                  464 × 832 px
                </span>
                {videoSrc && (
                  <>
                    <button type="button" onClick={toggleMute}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-stone-300 transition-all">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                    </button>
                    <button type="button" onClick={togglePlay}
                      className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-600/40 rounded-lg text-amber-300 transition-all">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Canvas Preview */}
            <div className="flex justify-center">
              <div
                className="relative cursor-crosshair rounded-xl overflow-hidden shadow-2xl ring-2 ring-amber-500/30"
                style={{ width: PREVIEW_W, height: PREVIEW_H }}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => { const t = e.touches[0]; handlePointerDown(t.clientX, t.clientY); }}
                onTouchMove={(e) => { const t = e.touches[0]; handlePointerMove(t.clientX, t.clientY); }}
                onTouchEnd={handlePointerUp}
              >
                <canvas
                  ref={canvasRef}
                  width={AARTI_CANVAS_W}
                  height={AARTI_CANVAS_H}
                  style={{ width: PREVIEW_W, height: PREVIEW_H, display: "block" }}
                />
                {!videoSrc && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 text-center">
                      <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-stone-300">વિડીયો અપલોડ કરો</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seek Bar */}
            {videoSrc && videoDuration > 0 && (
              <div className="mt-3">
                <input type="range"
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
                  className="w-full accent-amber-500 h-1.5 bg-stone-700 rounded-lg cursor-pointer" />
                <div className="flex justify-between text-[11px] text-stone-500 mt-0.5 font-mono">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{endTime.toFixed(1)}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Export Panel */}
          <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-amber-400 font-semibold text-sm sm:text-base flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-amber-500" />
              ૫. વિડીયો ડાઉનલોડ કરો (464×832)
            </h2>

            {errorMessage && (
              <div className="mb-3 bg-red-950/60 border border-red-700/60 text-red-300 text-xs rounded-lg p-3">
                ⚠️ {errorMessage}
              </div>
            )}

            {downloadSuccess && (
              <div className="mb-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                વિડીયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ!
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
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
                <div className="text-right text-[11px] text-stone-400 mt-1">{recordProgress}%</div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isRecording || !videoSrc}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 ${
                isRecording || !videoSrc
                  ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 via-amber-500 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isRecording ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Export કરી રહ્યા છીએ...</>
              ) : (
                <><Download className="w-5 h-5" /> 🎬 464×832 Video Export & Download</>
              )}
            </button>

            <div className="mt-3 text-[11px] text-stone-500 text-center">
              Full 464×832 · {selectedDuration.toFixed(0)}s · ૪.૫ Mbps · ઓડિયો સહ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
