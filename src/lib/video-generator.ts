// Audio-Video Recording and Composition Engine for Daily Aarti Videos
import { POSTER_WIDTH, POSTER_HEIGHT, PHOTO_FRAME, DATE_CONFIG, ImageTransform } from './poster-generator';

export const AARTI_RIBBON_CONFIG = {
  x: 552,
  y: 1251,
  fontSize: 38,
  fontFamily: "'Noto Sans Gujarati', 'Shruti', 'Gujarati MT', sans-serif",
  color: '#ffffff',
  fontWeight: 'bold',
  align: 'center' as CanvasTextAlign,
};

export type VideoLayoutMode = 'template' | 'story_9_16';

export interface AartiVideoOptions {
  aartiName: string; // e.g. "મંગળાઆરતી", "સંધ્યા આરતી"
  displayDate: string; // DD/MM/YYYY
  transform: ImageTransform;
  layoutMode: VideoLayoutMode;
}

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
 * Draw a single frame of the Aarti video composite onto the canvas
 */
export function renderAartiFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  overlayImg: HTMLImageElement | null,
  options: AartiVideoOptions
): void {
  const { aartiName, displayDate, transform, layoutMode } = options;

  if (layoutMode === 'template') {
    // ----------------------------------------------------
    // 1. CLASSIC TEMPLE FRAME (1086 × 1448)
    // ----------------------------------------------------
    ctx.fillStyle = '#fef5e3';
    ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

    // Draw Video Frame clipped to the temple's golden photo window
    ctx.save();
    ctx.beginPath();
    const { left, top, width, height, cornerRadius } = PHOTO_FRAME;
    drawRoundedRect(ctx, left, top, width, height, cornerRadius);
    ctx.clip();

    ctx.fillStyle = '#181512';
    ctx.fillRect(left, top, width, height);

    const frameCenterX = left + width / 2;
    const frameCenterY = top + height / 2;

    ctx.translate(frameCenterX + transform.panX, frameCenterY + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);

    const vidW = videoEl.videoWidth || 1080;
    const vidH = videoEl.videoHeight || 1920;

    const isRotated = transform.rotation % 180 !== 0;
    const effectiveW = isRotated ? vidH : vidW;
    const effectiveH = isRotated ? vidW : vidH;

    const scaleToCover = Math.max(width / effectiveW, height / effectiveH);
    const finalScale = scaleToCover * transform.zoom;

    const drawW = vidW * finalScale;
    const drawH = vidH * finalScale;

    try {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      // Ignore frame read if video is seeking
    }
    ctx.restore();

    // Draw Master Temple Overlay on top
    if (overlayImg) {
      ctx.drawImage(overlayImg, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    }

    // Dynamic Date Text in Date Pill
    ctx.save();
    ctx.fillStyle = DATE_CONFIG.color;
    ctx.font = `${DATE_CONFIG.fontWeight} ${DATE_CONFIG.fontSize}px ${DATE_CONFIG.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(displayDate, DATE_CONFIG.x, DATE_CONFIG.y);
    ctx.restore();

    // Dynamic Aarti Name in Red Ribbon
    ctx.save();
    ctx.fillStyle = AARTI_RIBBON_CONFIG.color;
    ctx.font = `${AARTI_RIBBON_CONFIG.fontWeight} ${AARTI_RIBBON_CONFIG.fontSize}px ${AARTI_RIBBON_CONFIG.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = AARTI_RIBBON_CONFIG.align;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillText(aartiName, AARTI_RIBBON_CONFIG.x, AARTI_RIBBON_CONFIG.y);
    ctx.restore();
  } else {
    // ----------------------------------------------------
    // 2. FULL-SCREEN 9:16 VERTICAL STORY / REEL (1080 × 1920)
    // ----------------------------------------------------
    const targetW = 1080;
    const targetH = 1920;

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, targetW, targetH);

    // Full-bleed video
    ctx.save();
    ctx.translate(targetW / 2 + transform.panX, targetH / 2 + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);

    const vidW = videoEl.videoWidth || 1080;
    const vidH = videoEl.videoHeight || 1920;

    const isRotated = transform.rotation % 180 !== 0;
    const effectiveW = isRotated ? vidH : vidW;
    const effectiveH = isRotated ? vidW : vidH;

    const scaleToCover = Math.max(targetW / effectiveW, targetH / effectiveH);
    const finalScale = scaleToCover * transform.zoom;

    const drawW = vidW * finalScale;
    const drawH = vidH * finalScale;

    try {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      // Ignore seek frame errors
    }
    ctx.restore();

    // Top Sacred Branding Overlay
    const topGrad = ctx.createLinearGradient(0, 0, 0, 260);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    topGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, targetW, 260);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.font = "bold 26px 'Outfit', sans-serif";
    ctx.fillText('॥ શ્રી ડભોડીયા હનુમાનજી મંદિર - ડભોડા ॥', targetW / 2, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 44px 'Noto Sans Gujarati', sans-serif";
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillText('દૈનિક મંગળા દર્શન • આરતી', targetW / 2, 130);
    ctx.restore();

    // Bottom Vignette & Devotional Badge Overlay
    const bottomGrad = ctx.createLinearGradient(0, targetH - 340, 0, targetH);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.6)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, targetH - 340, targetW, 340);

    // Frosted Pill Container for Date & Aarti
    const pillW = 680;
    const pillH = 110;
    const pillX = (targetW - pillW) / 2;
    const pillY = targetH - 180;

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 30);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)'; // Sacred vermilion crimson
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Text inside pill
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 44px 'Noto Sans Gujarati', sans-serif";
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`🪔 ${aartiName}`, targetW / 2, pillY + 50);

    ctx.fillStyle = '#fef08a'; // Warm amber-yellow
    ctx.font = "bold 26px 'Georgia', serif";
    ctx.fillText(`તારીખ : ${displayDate}`, targetW / 2, pillY + 88);
    ctx.restore();
  }
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
