// Audio-Video Recording and Composition Engine for Daily Aarti Videos
// Output: 464 × 832 px (9:16 vertical, full-bleed video with overlay elements)
import { ImageTransform } from './poster-generator';

export type VideoLayoutMode = 'template' | 'story_9_16';

export interface AartiVideoOptions {
  aartiName: string;     // e.g. "મંગળાઆરતી", "સંધ્યા આરતી"
  displayDate: string;   // DD/MM/YYYY
  transform: ImageTransform;
  layoutMode: VideoLayoutMode;
}

// Final output canvas dimensions for aarti video
export const AARTI_CANVAS_W = 464;
export const AARTI_CANVAS_H = 832;

/**
 * Universal rounded rectangle path helper
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

/**
 * Measure text width safely, with a fallback
 */
function measureText(ctx: CanvasRenderingContext2D, text: string): number {
  try {
    return ctx.measureText(text).width;
  } catch {
    return text.length * 16;
  }
}

/**
 * Render a single frame of the Aarti video composite onto the canvas (464 × 832)
 * The video is full-bleed; overlays sit on top.
 */
export function renderAartiFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  _overlayImg: HTMLImageElement | null, // kept for API compatibility, unused
  options: AartiVideoOptions
): void {
  const { aartiName, displayDate, transform } = options;
  const W = AARTI_CANVAS_W;
  const H = AARTI_CANVAS_H;

  // ─────────────────────────────────────────────────────────────
  // 1. BLACK BACKGROUND (visible if video doesn't cover)
  // ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0c0a08';
  ctx.fillRect(0, 0, W, H);

  // ─────────────────────────────────────────────────────────────
  // 2. FULL-BLEED VIDEO (cover-fill, centered)
  // ─────────────────────────────────────────────────────────────
  if (videoEl && videoEl.readyState >= 2) {
    ctx.save();
    // Clip to canvas bounds
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    const vidW = videoEl.videoWidth || W;
    const vidH = videoEl.videoHeight || H;

    const isRotated = transform.rotation % 180 !== 0;
    const effectiveW = isRotated ? vidH : vidW;
    const effectiveH = isRotated ? vidW : vidH;

    // Cover-scale: fill entire canvas
    const scaleToCover = Math.max(W / effectiveW, H / effectiveH);
    const finalScale = scaleToCover * transform.zoom;

    const drawW = vidW * finalScale;
    const drawH = vidH * finalScale;

    ctx.translate(W / 2 + transform.panX, H / 2 + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);

    try {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      // Ignore frame read errors while seeking
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 3. TOP GRADIENT OVERLAY (for text legibility)
  // ─────────────────────────────────────────────────────────────
  const topGrad = ctx.createLinearGradient(0, 0, 0, 160);
  topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  topGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.38)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 160);

  // ─────────────────────────────────────────────────────────────
  // 4. BOTTOM GRADIENT OVERLAY
  // ─────────────────────────────────────────────────────────────
  const bottomGrad = ctx.createLinearGradient(0, H - 200, 0, H);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
  bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - 200, W, 200);

  // ─────────────────────────────────────────────────────────────
  // 5. TOP-LEFT: Aarti Title (English / user-selected)
  // ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Aarti name in bold white
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  ctx.fillText(aartiName, 16, 20);

  // Date on next line (or same line right side)
  ctx.font = "bold 18px 'Georgia', serif";
  ctx.fillStyle = '#fde68a';
  ctx.shadowBlur = 6;
  ctx.fillText(displayDate, 16, 52);
  ctx.restore();

  // ─────────────────────────────────────────────────────────────
  // 6. BOTTOM SECTION: Handle + Date Pill + Aarti Name
  // ─────────────────────────────────────────────────────────────

  // 6a. Instagram Handle
  ctx.save();
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.font = "600 14px 'Outfit', 'Inter', sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 5;
  ctx.fillText('@dabhodiyahanumanji_official', W / 2, H - 168);
  ctx.restore();

  // 6b. Date Pill (amber/golden background with calendar icon look)
  const pillW = W - 32;
  const pillH = 42;
  const pillX = 16;
  const pillY = H - 158;

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 10);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.92)'; // amber
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  // Calendar icon shape (simple square icon)
  const iconX = pillX + 12;
  const iconY = pillY + 8;
  const iconSize = 26;
  ctx.save();
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  drawRoundedRect(ctx, iconX, iconY, iconSize, iconSize, 4);
  ctx.fill();
  // Calendar lines
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(iconX + 4, iconY + 9);
  ctx.lineTo(iconX + iconSize - 4, iconY + 9);
  ctx.stroke();
  // dots
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(iconX + 8, iconY + 16, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(iconX + 13, iconY + 16, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(iconX + 18, iconY + 16, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Date text in the pill
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = "bold 17px 'Georgia', serif";
  ctx.fillStyle = '#1c1917';
  ctx.shadowColor = 'transparent';
  ctx.fillText(`તારીખ : ${displayDate}`, iconX + iconSize + 10, pillY + pillH / 2);
  ctx.restore();

  // 6c. Aarti Name Red Ribbon at very bottom
  const ribbonY = H - 110;
  const ribbonH = 48;

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, 0, ribbonY, W, ribbonH, 0);
  // Crimson gradient ribbon
  const ribbonGrad = ctx.createLinearGradient(0, ribbonY, W, ribbonY);
  ribbonGrad.addColorStop(0, '#7f1d1d');
  ribbonGrad.addColorStop(0.3, '#dc2626');
  ribbonGrad.addColorStop(0.7, '#dc2626');
  ribbonGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = ribbonGrad;
  ctx.fill();

  // Gold border lines
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

  // Aarti name text centered in ribbon
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "bold 24px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(`🪔 ${aartiName}`, W / 2, ribbonY + ribbonH / 2);
  ctx.restore();

  // ─────────────────────────────────────────────────────────────
  // 7. THIN GOLD BORDER AROUND THE ENTIRE CANVAS
  // ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  ctx.restore();
}

/**
 * Determine the best supported video MIME type for MediaRecorder in the current browser
 */
export function getSupportedVideoMimeType(): { mimeType: string; extension: string } {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }

  const candidates = [
    { type: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { type: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { type: 'video/mp4', ext: 'mp4' },
    { type: 'video/webm;codecs=h264,opus', ext: 'mp4' },
    { type: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { type: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { type: 'video/webm', ext: 'webm' },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.type)) {
      return { mimeType: candidate.type, extension: candidate.ext };
    }
  }

  return { mimeType: '', extension: 'webm' };
}

/**
 * Record the animated canvas with mixed audio from the video element
 */
export function recordAartiVideo(
  canvas: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  overlayImg: HTMLImageElement | null,
  options: AartiVideoOptions,
  startTimeSec: number,
  endTimeSec: number,
  onProgress?: (pct: number, curSec: number, totalSec: number) => void
): Promise<{ blob: Blob; filename: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not acquire canvas context');

      const totalDuration = Math.max(1, endTimeSec - startTimeSec);
      const { mimeType, extension } = getSupportedVideoMimeType();

      // Setup Canvas Capture Stream (30 FPS)
      const captureStream = (canvas as any).captureStream
        ? (canvas as any).captureStream(30)
        : (canvas as any).mozCaptureStream
        ? (canvas as any).mozCaptureStream(30)
        : null;

      if (!captureStream) {
        throw new Error('Canvas video stream capture is not supported in this browser.');
      }

      // Mix Video Audio into Stream via Web Audio API if available
      let audioTracks: MediaStreamTrack[] = [];
      let audioCtx: AudioContext | null = null;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaElementSource(videoEl);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          audioTracks = dest.stream.getAudioTracks();
        }
      } catch (audioErr) {
        console.warn('Audio capture warning (video may be silent or already attached):', audioErr);
      }

      // Combine video track + audio tracks
      const streamTracks = [...captureStream.getVideoTracks(), ...audioTracks];
      const combinedStream = new MediaStream(streamTracks);

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 4_500_000, // Crisp 4.5 Mbps bitrate
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType || 'video/mp4' });
        const cleanDate = options.displayDate.replace(/\//g, '-');
        const filename = `Dabhodiya-Hanumanji-${options.aartiName.replace(/\s+/g, '')}-${cleanDate}.${extension}`;
        resolve({ blob: finalBlob, filename });
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      // Reset video to start time and begin recording
      videoEl.currentTime = startTimeSec;
      await new Promise<void>((r) => {
        const onSeeked = () => {
          videoEl.removeEventListener('seeked', onSeeked);
          r();
        };
        videoEl.addEventListener('seeked', onSeeked);
        // Fallback timeout in case seeked doesn't fire
        setTimeout(onSeeked, 600);
      });

      // Render initial frame
      renderAartiFrame(ctx, videoEl, overlayImg, options);

      // Start recorder
      recorder.start(100); // 100ms slice chunks

      // Unmute during export so audio flows to audioCtx
      const prevMuted = videoEl.muted;
      videoEl.muted = false;

      let isRecording = true;

      const stopRecording = () => {
        if (!isRecording) return;
        isRecording = false;
        videoEl.pause();
        videoEl.muted = prevMuted;
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      // Play video
      await videoEl.play();

      // Render loop during playback
      const renderTick = () => {
        if (!isRecording) return;

        renderAartiFrame(ctx, videoEl, overlayImg, options);

        const currentSec = videoEl.currentTime - startTimeSec;
        const progress = Math.min(100, Math.max(0, Math.round((currentSec / totalDuration) * 100)));
        if (onProgress) {
          onProgress(progress, Math.min(currentSec, totalDuration), totalDuration);
        }

        if (videoEl.currentTime >= endTimeSec || videoEl.ended) {
          stopRecording();
          return;
        }

        requestAnimationFrame(renderTick);
      };

      requestAnimationFrame(renderTick);
    } catch (err) {
      reject(err);
    }
  });
}
