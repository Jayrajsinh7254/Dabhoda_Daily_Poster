// Audio-Video Recording and Composition Engine for Daily Aarti Videos
// Supports:
// 1. 'template' mode: 1086 × 1448 px — Exact same authentic temple poster layout as Photo Poster
// 2. 'story_9_16' mode: 464 × 832 px — Full-bleed 9:16 vertical video with temple overlays
import {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  PHOTO_FRAME,
  DATE_CONFIG,
  WEEKDAY_CONFIG,
  drawAutoFitText,
  ImageTransform,
} from './poster-generator';

export type VideoLayoutMode = 'template' | 'story_9_16';

export interface AartiVideoOptions {
  aartiName: string;        // e.g. "મંગળાઆરતી"
  displayDate: string;      // DD/MM/YYYY
  transform: ImageTransform;
  layoutMode: VideoLayoutMode;
  logoImg?: HTMLImageElement | null;   // Temple circular logo (cropped from template)
  idleImg?: HTMLImageElement | null;   // Placeholder idol image when no video is playing
}

// Canvas dimensions for both modes
export const TEMPLATE_CANVAS_W = POSTER_WIDTH;  // 1086
export const TEMPLATE_CANVAS_H = POSTER_HEIGHT; // 1448

export const STORY_CANVAS_W = 464;
export const STORY_CANVAS_H = 832;

// Keep old exports for backwards compatibility
export const AARTI_CANVAS_W = STORY_CANVAS_W;
export const AARTI_CANVAS_H = STORY_CANVAS_H;

// Logo crop region from daily-darshan-template.png (1086 × 1448 source)
export const LOGO_CROP = { sx: 380, sy: 0, sw: 326, sh: 230 };

/**
 * Universal rounded rectangle path helper
 */
export function roundRect(
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
 * Draw video inside the 1086 × 1448 Photo Poster frame
 */
function drawTemplateVideo(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  idleImg: HTMLImageElement | null | undefined,
  transform: ImageTransform
) {
  const { left, top, width, height, cornerRadius } = PHOTO_FRAME;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, left, top, width, height, cornerRadius);
  ctx.clip();

  // Dark frame background
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(left, top, width, height);

  const frameCenterX = left + width / 2;
  const frameCenterY = top + height / 2;

  if (videoEl && videoEl.readyState >= 2) {
    const vidW = videoEl.videoWidth || width;
    const vidH = videoEl.videoHeight || height;

    const isRotated = transform.rotation % 180 !== 0;
    const effectiveW = isRotated ? vidH : vidW;
    const effectiveH = isRotated ? vidW : vidH;

    const scaleToCover = Math.max(width / effectiveW, height / effectiveH);
    const finalScale = scaleToCover * transform.zoom;

    const drawW = vidW * finalScale;
    const drawH = vidH * finalScale;

    ctx.translate(frameCenterX + transform.panX, frameCenterY + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    try {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      /* ignore seek race conditions */
    }
  } else if (idleImg && idleImg.complete && idleImg.naturalWidth > 0) {
    // Draw placeholder idol when idle
    const imgW = idleImg.naturalWidth;
    const imgH = idleImg.naturalHeight;
    const scaleToCover = Math.max(width / imgW, height / imgH);
    const finalScale = scaleToCover * transform.zoom;
    const drawW = imgW * finalScale;
    const drawH = imgH * finalScale;

    ctx.translate(frameCenterX + transform.panX, frameCenterY + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.drawImage(idleImg, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    // Elegant fallback pattern
    ctx.fillStyle = '#292524';
    ctx.fillRect(left, top, width, height);
    ctx.font = "bold 28px 'Noto Sans Gujarati', sans-serif";
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪔 વિડીયો પ્લે / અપલોડ કરો', frameCenterX, frameCenterY);
  }

  ctx.restore();
}

/**
 * Draw 1086 × 1448 Temple Poster Layout (Same as Photo Poster)
 */
function renderTemplateLayout(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  overlayImg: HTMLImageElement | null,
  options: AartiVideoOptions
) {
  const { aartiName, displayDate, transform, idleImg } = options;

  // 1. Fill canvas with the warm cream temple background
  ctx.fillStyle = '#fef5e3';
  ctx.fillRect(0, 0, TEMPLATE_CANVAS_W, TEMPLATE_CANVAS_H);

  // 2. Draw user video/placeholder clipped to the rounded photo frame
  drawTemplateVideo(ctx, videoEl, idleImg, transform);

  // 3. Draw master template overlay (frames, logo, typography, icons, bells)
  if (overlayImg && overlayImg.complete && overlayImg.naturalWidth > 0) {
    ctx.drawImage(overlayImg, 0, 0, TEMPLATE_CANVAS_W, TEMPLATE_CANVAS_H);
  }

  // 4. Draw Dynamic Date text in the date pill
  ctx.save();
  ctx.fillStyle = DATE_CONFIG.color;
  ctx.font = `${DATE_CONFIG.fontWeight} ${DATE_CONFIG.fontSize}px ${DATE_CONFIG.fontFamily}`;
  ctx.textBaseline = DATE_CONFIG.baseline;
  ctx.textAlign = DATE_CONFIG.align;
  ctx.fillText(displayDate, DATE_CONFIG.x, DATE_CONFIG.y);
  ctx.restore();

  // 5. Draw Dynamic Aarti Name in the red ribbon with auto-fitting between lotuses
  drawAutoFitText(
    ctx,
    aartiName,
    WEEKDAY_CONFIG.x,
    WEEKDAY_CONFIG.y,
    WEEKDAY_CONFIG.maxAvailableWidth,
    WEEKDAY_CONFIG.fontSize,
    WEEKDAY_CONFIG.fontWeight,
    WEEKDAY_CONFIG.fontFamily,
    WEEKDAY_CONFIG.color,
    WEEKDAY_CONFIG.minFontSize,
    true
  );
}

/**
 * Draw the full-bleed video layer for 464 × 832
 */
function drawStoryVideoLayer(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  idleImg: HTMLImageElement | null | undefined,
  transform: ImageTransform,
  W: number,
  H: number
) {
  if (videoEl && videoEl.readyState >= 2) {
    const vidW = videoEl.videoWidth || W;
    const vidH = videoEl.videoHeight || H;

    const isRotated = transform.rotation % 180 !== 0;
    const effectiveW = isRotated ? vidH : vidW;
    const effectiveH = isRotated ? vidW : vidH;

    const scaleToCover = Math.max(W / effectiveW, H / effectiveH);
    const finalScale = scaleToCover * transform.zoom;

    const drawW = vidW * finalScale;
    const drawH = vidH * finalScale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W / 2 + transform.panX, H / 2 + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    try {
      ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      /* ignore seek errors */
    }
    ctx.restore();
  } else if (idleImg && idleImg.complete && idleImg.naturalWidth > 0) {
    const imgW = idleImg.naturalWidth;
    const imgH = idleImg.naturalHeight;
    const scaleToCover = Math.max(W / imgW, H / imgH);
    const finalScale = scaleToCover * transform.zoom;
    const drawW = imgW * finalScale;
    const drawH = imgH * finalScale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W / 2 + transform.panX, H / 2 + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.drawImage(idleImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, W, H);
  }
}

/**
 * Draw 464 × 832 Story / Reels Layout
 */
function renderStoryLayout(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  options: AartiVideoOptions
) {
  const { aartiName, displayDate, transform, logoImg, idleImg } = options;
  const W = STORY_CANVAS_W;
  const H = STORY_CANVAS_H;
  const cx = W / 2;

  // 1. Background video / idol
  drawStoryVideoLayer(ctx, videoEl, idleImg, transform, W, H);

  // 2. Top + bottom gradient bands
  const topGrad = ctx.createLinearGradient(0, 0, 0, 260);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.88)');
  topGrad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 260);

  const botGrad = ctx.createLinearGradient(0, H - 250, 0, H);
  botGrad.addColorStop(0, 'rgba(0,0,0,0)');
  botGrad.addColorStop(0.3, 'rgba(0,0,0,0.6)');
  botGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 250, W, 250);

  // 3. Top Header: Circular Logo
  const logoSize = 72;
  const logoY = 12;

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      logoImg,
      LOGO_CROP.sx, LOGO_CROP.sy, LOGO_CROP.sw, LOGO_CROP.sh,
      cx - logoSize / 2, logoY, logoSize, logoSize
    );
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, logoY + logoSize / 2, logoSize / 2 + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const afterLogo = logoY + logoSize + 6;

  // Top mantras
  ctx.save();
  ctx.font = "bold 11px 'Noto Sans Gujarati', sans-serif";
  ctx.fillStyle = '#fde68a';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('॥ જય શ્રી રામ ॥', 10, 18);
  ctx.textAlign = 'right';
  ctx.fillText('॥ જય શ્રી હનુમાન ॥', W - 10, 18);
  ctx.restore();

  // Temple Name
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 6;
  ctx.font = "bold 22px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('શ્રી ડભોડીયા હનુમાનજી', cx, afterLogo);
  ctx.restore();

  // Subtitle
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 5;
  ctx.font = "bold 16px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🪔 ' + aartiName, cx, afterLogo + 28);
  ctx.restore();

  // Thin gold divider
  const divY = afterLogo + 52;
  ctx.save();
  const divGrad = ctx.createLinearGradient(20, 0, W - 20, 0);
  divGrad.addColorStop(0, 'rgba(251,191,36,0)');
  divGrad.addColorStop(0.3, 'rgba(251,191,36,0.8)');
  divGrad.addColorStop(0.7, 'rgba(251,191,36,0.8)');
  divGrad.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(20, divY);
  ctx.lineTo(W - 20, divY);
  ctx.stroke();
  ctx.restore();

  // 4. Bottom Info
  const padX = 16;
  // Social handle row
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = "500 12px 'Outfit', 'Inter', sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('@dabhodiyahanumanji_official', cx, H - 190);
  ctx.restore();

  // Date Pill
  const pillW = W - padX * 2;
  const pillH = 40;
  const pillX = padX;
  const pillY = H - 174;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, pillX, pillY, pillW, pillH, 10);
  ctx.fillStyle = 'rgba(251,191,36,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  // Date text in pill
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = "bold 16px 'Georgia', 'Times New Roman', serif";
  ctx.fillStyle = '#1c1917';
  ctx.fillText(`તારીખ : ${displayDate}`, cx, pillY + pillH / 2);
  ctx.restore();

  // Aarti Name Red Ribbon
  const ribY = H - 126;
  const ribH = 46;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ribY, W, ribH);
  const ribGrad = ctx.createLinearGradient(0, 0, W, 0);
  ribGrad.addColorStop(0, '#7f1d1d');
  ribGrad.addColorStop(0.25, '#dc2626');
  ribGrad.addColorStop(0.75, '#dc2626');
  ribGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = ribGrad;
  ctx.fill();

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  [[0, ribY], [0, ribY + ribH]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });

  drawAutoFitText(
    ctx,
    `🪔  ${aartiName}`,
    cx,
    ribY + ribH / 2,
    W - 32,
    21,
    'bold',
    "'Noto Sans Gujarati', 'Shruti', sans-serif",
    '#ffffff',
    15,
    true
  );
  ctx.restore();

  // Bottom strip: Handles & WhatsApp
  const iconsY = H - 72;
  const iconRowH = 62;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, iconsY, W, iconRowH);

  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, iconsY + 8);
  ctx.lineTo(W / 2, iconsY + iconRowH - 8);
  ctx.stroke();

  // Left handles
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;

  ctx.font = "bold 9px 'Outfit', sans-serif";
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('📷', 8, iconsY + 18);
  ctx.font = "500 8.5px 'Outfit', sans-serif";
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText('@DABHODIYAHANUMANJI_OFFICIAL', 22, iconsY + 18);

  ctx.font = "bold 9px 'Outfit', sans-serif";
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('▶', 8, iconsY + 38);
  ctx.font = "500 8.5px 'Outfit', sans-serif";
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText('@DABHODIYAHANUMANJI_OFFICIAL', 22, iconsY + 38);

  // Right WhatsApp
  ctx.textAlign = 'center';
  ctx.font = "bold 9px 'Outfit', sans-serif";
  ctx.fillStyle = '#4ade80';
  ctx.fillText('📱 WhatsApp', W * 0.75, iconsY + 18);

  ctx.font = "bold 11px 'Georgia', serif";
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MO : 9091801818', W * 0.75, iconsY + 38);
  ctx.restore();

  // Outer gold border frame
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(1.75, 1.75, W - 3.5, H - 3.5);
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.restore();
}

/**
 * Main render function — renders one frame of Aarti video poster.
 * Supports both 'template' (1086×1448) and 'story_9_16' (464×832) modes.
 */
export function renderAartiFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  overlayImg: HTMLImageElement | null,
  options: AartiVideoOptions
): void {
  if (options.layoutMode === 'template') {
    renderTemplateLayout(ctx, videoEl, overlayImg, options);
  } else {
    renderStoryLayout(ctx, videoEl, options);
  }
}

/**
 * Determine the best supported video MIME type for MediaRecorder
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
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.type)) return { mimeType: c.type, extension: c.ext };
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
      const isTemplate = options.layoutMode === 'template';
      const targetW = isTemplate ? TEMPLATE_CANVAS_W : STORY_CANVAS_W;
      const targetH = isTemplate ? TEMPLATE_CANVAS_H : STORY_CANVAS_H;

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not acquire canvas context');

      const totalDuration = Math.max(1, endTimeSec - startTimeSec);
      const { mimeType, extension } = getSupportedVideoMimeType();

      const captureStream = (canvas as any).captureStream
        ? (canvas as any).captureStream(30)
        : (canvas as any).mozCaptureStream
        ? (canvas as any).mozCaptureStream(30)
        : null;

      if (!captureStream) throw new Error('Canvas video stream capture not supported.');

      let audioTracks: MediaStreamTrack[] = [];
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          const source = audioCtx.createMediaElementSource(videoEl);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          audioTracks = dest.stream.getAudioTracks();
        }
      } catch (e) {
        console.warn('Audio capture note:', e);
      }

      const combinedStream = new MediaStream([...captureStream.getVideoTracks(), ...audioTracks]);
      const recOpts: MediaRecorderOptions = { videoBitsPerSecond: isTemplate ? 6_000_000 : 4_500_000 };
      if (mimeType) recOpts.mimeType = mimeType;

      const recorder = new MediaRecorder(combinedStream, recOpts);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
        const cleanDate = options.displayDate.replace(/\//g, '-');
        const layoutSuffix = isTemplate ? 'Poster' : 'Reel';
        const filename = `Dabhodiya-${options.aartiName.replace(/\s+/g, '')}-${cleanDate}-${layoutSuffix}.${extension}`;
        resolve({ blob, filename });
      };
      recorder.onerror = reject;

      videoEl.currentTime = startTimeSec;
      await new Promise<void>((r) => {
        const fn = () => {
          videoEl.removeEventListener('seeked', fn);
          r();
        };
        videoEl.addEventListener('seeked', fn);
        setTimeout(fn, 600);
      });

      renderAartiFrame(ctx, videoEl, overlayImg, options);
      recorder.start(100);

      const prevMuted = videoEl.muted;
      videoEl.muted = false;
      let active = true;

      const stop = () => {
        if (!active) return;
        active = false;
        videoEl.pause();
        videoEl.muted = prevMuted;
        if (recorder.state === 'recording') recorder.stop();
      };

      await videoEl.play();

      const tick = () => {
        if (!active) return;
        renderAartiFrame(ctx, videoEl, overlayImg, options);
        const cur = videoEl.currentTime - startTimeSec;
        const pct = Math.min(100, Math.max(0, Math.round((cur / totalDuration) * 100)));
        onProgress?.(pct, Math.min(cur, totalDuration), totalDuration);
        if (videoEl.currentTime >= endTimeSec || videoEl.ended) {
          stop();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) {
      reject(err);
    }
  });
}
