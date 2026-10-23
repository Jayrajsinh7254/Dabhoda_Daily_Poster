// Audio-Video Recording and Composition Engine for Daily Aarti Videos
// Output: 464 × 832 px (9:16 vertical, full-bleed video with overlay elements)
import { ImageTransform } from './poster-generator';

export type VideoLayoutMode = 'template' | 'story_9_16';

export interface AartiVideoOptions {
  aartiName: string;        // e.g. "મંગળાઆરતી"
  displayDate: string;      // DD/MM/YYYY
  transform: ImageTransform;
  layoutMode: VideoLayoutMode;
  logoImg?: HTMLImageElement | null;   // Temple circular logo (cropped from template)
}

// Final output canvas dimensions for aarti video poster
export const AARTI_CANVAS_W = 464;
export const AARTI_CANVAS_H = 832;

// Logo crop region from daily-darshan-template.png (1086 × 1448 source)
// The circular logo sits at approx x:380, y:0, w:326, h:230
export const LOGO_CROP = { sx: 380, sy: 0, sw: 326, sh: 230 };

/**
 * Universal rounded rectangle path helper
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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
 * Draw the full-bleed video layer clipped to canvas
 */
function drawVideoLayer(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  transform: ImageTransform,
  W: number,
  H: number
) {
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
  } catch { /* ignore seek errors */ }
  ctx.restore();
}

/**
 * Draw top + bottom gradient overlay darkening bands
 */
function drawGradientBands(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Top band — heavier to accommodate temple title block
  const topGrad = ctx.createLinearGradient(0, 0, 0, 260);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.88)');
  topGrad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 260);

  // Bottom band
  const botGrad = ctx.createLinearGradient(0, H - 250, 0, H);
  botGrad.addColorStop(0, 'rgba(0,0,0,0)');
  botGrad.addColorStop(0.3, 'rgba(0,0,0,0.6)');
  botGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 250, W, 250);
}

/**
 * Draw top temple header: logo + temple name + aarti subtitle
 */
function drawTopHeader(
  ctx: CanvasRenderingContext2D,
  aartiName: string,
  W: number,
  logoImg: HTMLImageElement | null | undefined
) {
  const cx = W / 2;

  // ── Circular Logo ──
  const logoSize = 72;
  const logoY = 10;

  if (logoImg) {
    ctx.save();
    // Clip to a circle for clean logo
    ctx.beginPath();
    ctx.arc(cx, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      logoImg,
      LOGO_CROP.sx, LOGO_CROP.sy, LOGO_CROP.sw, LOGO_CROP.sh,
      cx - logoSize / 2, logoY, logoSize, logoSize
    );
    ctx.restore();

    // Gold circle border
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, logoY + logoSize / 2, logoSize / 2 + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    // Fallback: draw a flame emoji in a circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,191,36,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('🔱', cx, logoY + logoSize / 2);
    ctx.restore();
  }

  const afterLogo = logoY + logoSize + 6;

  // ── Top mantras: left & right ──
  ctx.save();
  ctx.font = "bold 11px 'Noto Sans Gujarati', sans-serif";
  ctx.fillStyle = '#fde68a';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('॥ જય શ્રી રામ ॥', 8, 18);
  ctx.textAlign = 'right';
  ctx.fillText('॥ જય શ્રી હનુમાન ॥', W - 8, 18);
  ctx.restore();

  // ── Temple name: "શ્રી ડભોડીયા હનુમાનજી" ──
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 6;
  ctx.font = "bold 22px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('શ્રી ડભોડીયા હનુમાનજી', cx, afterLogo);
  ctx.restore();

  // ── Subtitle: Aarti type centered ──
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 5;
  ctx.font = "bold 16px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🪔 ' + aartiName, cx, afterLogo + 28);
  ctx.restore();

  // ── Thin gold divider line ──
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
}

/**
 * Draw bottom info section: date pill + aarti ribbon + social handles
 */
function drawBottomInfo(
  ctx: CanvasRenderingContext2D,
  aartiName: string,
  displayDate: string,
  W: number,
  H: number
) {
  const cx = W / 2;
  const padX = 16;

  // ── Social handle row (above date pill) ──
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = "500 12px 'Outfit', 'Inter', sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('@dabhodiyahanumanji_official', cx, H - 190);
  ctx.restore();

  // ── Date Pill ──
  const pillW = W - padX * 2;
  const pillH = 40;
  const pillX = padX;
  const pillY = H - 174;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, pillX, pillY, pillW, pillH, 10);
  ctx.fillStyle = 'rgba(251,191,36,0.93)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  // Calendar icon (tiny box)
  const icX = pillX + 12;
  const icY = pillY + 8;
  const icS = 24;
  ctx.save();
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  roundRect(ctx, icX, icY, icS, icS, 3);
  ctx.fill();
  // lines
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(icX + 3, icY + 8);
  ctx.lineTo(icX + icS - 3, icY + 8);
  ctx.stroke();
  // dots
  ctx.fillStyle = '#fde68a';
  for (const [dx, dy] of [[6, 15], [12, 15], [18, 15]]) {
    ctx.beginPath();
    ctx.arc(icX + dx, icY + dy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Date text in pill — centered in remaining space
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = "bold 16px 'Georgia', 'Times New Roman', serif";
  ctx.fillStyle = '#1c1917';
  ctx.shadowColor = 'transparent';
  const textX = pillX + icS + 20 + (pillW - icS - 20) / 2;
  ctx.fillText(`તારીખ : ${displayDate}`, textX, pillY + pillH / 2);
  ctx.restore();

  // ── Aarti Name — Red Ribbon ──
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

  // Gold top & bottom border lines
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  [[0, ribY], [0, ribY + ribH]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });

  // Aarti text — CENTERED
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "bold 21px 'Noto Sans Gujarati', 'Shruti', sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 4;
  ctx.fillText(`🪔  ${aartiName}`, cx, ribY + ribH / 2);
  ctx.restore();

  // ── Social icons row at the very bottom ──
  const iconsY = H - 72;
  const iconRowH = 62;

  // Background strip
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, iconsY, W, iconRowH);
  ctx.restore();

  // Divider between left (handles) and right (WhatsApp)
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, iconsY + 8);
  ctx.lineTo(W / 2, iconsY + iconRowH - 8);
  ctx.stroke();
  ctx.restore();

  // Left: social handles
  const handles = [
    { icon: '📷', text: '@DABHODIYAHANUMANJI_OFFICIAL' },
    { icon: '▶', text: '@DABHODIYAHANUMANJI_OFFICIAL' },
  ];
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;
  handles.forEach((h, i) => {
    const y = iconsY + 16 + i * 20;
    ctx.font = "bold 9px 'Outfit', sans-serif";
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(h.icon, 8, y);
    ctx.font = "500 8.5px 'Outfit', sans-serif";
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(h.text, 22, y);
  });
  ctx.restore();

  // Right: WhatsApp number
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;

  ctx.font = "bold 9px 'Outfit', sans-serif";
  ctx.fillStyle = '#4ade80';
  ctx.fillText('📱 WhatsApp', W * 0.75, iconsY + 16);

  ctx.font = "bold 11px 'Georgia', serif";
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MO : 9091801818', W * 0.75, iconsY + 35);
  ctx.restore();
}

/**
 * Draw the outer gold border frame
 */
function drawBorder(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  // Outer amber border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(1.75, 1.75, W - 3.5, H - 3.5);
  // Inner thin border
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.restore();
}

/**
 * Main render function — draws one frame of the 464×832 aarti video poster.
 * videoEl may be null when rendering the idle/placeholder state.
 */
export function renderAartiFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  _overlayImg: HTMLImageElement | null, // kept for API compat, unused
  options: AartiVideoOptions
): void {
  const { aartiName, displayDate, transform, logoImg } = options;
  const W = AARTI_CANVAS_W;
  const H = AARTI_CANVAS_H;

  // 1. Background (drawn by caller when idle; here only if needed)
  // Full-bleed video
  if (videoEl && videoEl.readyState >= 2) {
    drawVideoLayer(ctx, videoEl, transform, W, H);
  }

  // 3. Gradient bands
  drawGradientBands(ctx, W, H);

  // 4. Top header (logo + temple name + aarti)
  drawTopHeader(ctx, aartiName, W, logoImg);

  // 5. Bottom info (date pill + ribbon + social)
  drawBottomInfo(ctx, aartiName, displayDate, W, H);

  // 6. Gold border frame
  drawBorder(ctx, W, H);
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
      } catch (e) { console.warn('Audio capture:', e); }

      const combinedStream = new MediaStream([...captureStream.getVideoTracks(), ...audioTracks]);
      const recOpts: MediaRecorderOptions = { videoBitsPerSecond: 4_500_000 };
      if (mimeType) recOpts.mimeType = mimeType;

      const recorder = new MediaRecorder(combinedStream, recOpts);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
        const cleanDate = options.displayDate.replace(/\//g, '-');
        const filename = `Dabhodiya-${options.aartiName.replace(/\s+/g, '')}-${cleanDate}.${extension}`;
        resolve({ blob, filename });
      };
      recorder.onerror = reject;

      videoEl.currentTime = startTimeSec;
      await new Promise<void>((r) => {
        const fn = () => { videoEl.removeEventListener('seeked', fn); r(); };
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
        if (videoEl.currentTime >= endTimeSec || videoEl.ended) { stop(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) { reject(err); }
  });
}
