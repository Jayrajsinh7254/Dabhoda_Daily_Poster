// Constants and utilities for Daily Darshan Poster Generation

export const POSTER_WIDTH = 1086;
export const POSTER_HEIGHT = 1448;

// Photo frame bounds inside the template
export const PHOTO_FRAME = {
  left: 157,
  top: 427,
  width: 802,
  height: 784,
  cornerRadius: 25,
};

// Date text positioning inside the date pill
export const DATE_CONFIG = {
  x: 605,
  y: 1187,
  fontSize: 30,
  fontFamily: "'Georgia', 'Times New Roman', serif",
  color: '#16161b',
  fontWeight: 'bold',
  align: 'center' as CanvasTextAlign,
  baseline: 'middle' as CanvasTextBaseline,
};

// Weekday text positioning inside the red ribbon
export const WEEKDAY_CONFIG = {
  x: 552.5,
  y: 1249,
  maxAvailableWidth: 205, // Clear width between left lotus (ends ~445) and right lotus (starts ~660)
  fontSize: 36,
  minFontSize: 24,
  fontFamily: "'Noto Sans Gujarati', 'Shruti', 'Gujarati MT', sans-serif",
  color: '#ffffff',
  fontWeight: 'bold',
  align: 'center' as CanvasTextAlign,
  baseline: 'middle' as CanvasTextBaseline,
};

/**
 * Draw auto-fitted single line text within a maximum width boundary
 */
export function drawAutoFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  baseFontSize: number,
  fontWeight: string,
  fontFamily: string,
  color: string,
  minFontSize: number = 22,
  shadow: boolean = false
): void {
  ctx.save();
  let fontSize = baseFontSize;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const measuredWidth = ctx.measureText(text).width;

  if (measuredWidth > maxWidth && measuredWidth > 0) {
    const scale = maxWidth / measuredWidth;
    fontSize = Math.max(minFontSize, Math.floor(baseFontSize * scale));
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
  }
  ctx.fillText(text, centerX, centerY);
  ctx.restore();
}

// Gujarati weekday names
export const GUJARATI_WEEKDAYS: Record<string, string> = {
  Sunday: 'રવિવાર',
  Monday: 'સોમવાર',
  Tuesday: 'મંગળવાર',
  Wednesday: 'બુધવાર',
  Thursday: 'ગુરુવાર',
  Friday: 'શુક્રવાર',
  Saturday: 'શનિવાર',
};

export interface ImageTransform {
  zoom: number; // 0.5 to 3.0
  panX: number; // pixel offset
  panY: number; // pixel offset
  rotation: number; // 0, 90, 180, 270 degrees
}

export const DEFAULT_TRANSFORM: ImageTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
};

/**
 * Get current date in Asia/Kolkata timezone or from an optional override (YYYY-MM-DD).
 */
export function getKolkataDateInfo(overrideIsoDate?: string): {
  isoDate: string; // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  weekdayEnglish: string;
  weekdayGujarati: string;
} {
  let targetDate: Date;

  if (overrideIsoDate) {
    const [y, m, d] = overrideIsoDate.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    targetDate = new Date();
  }

  const dayFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });

  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const displayDate = dayFormatter.format(targetDate);
  const weekdayEnglish = weekdayFormatter.format(targetDate);
  const weekdayGujarati = GUJARATI_WEEKDAYS[weekdayEnglish] || weekdayEnglish;
  const isoDate = isoFormatter.format(targetDate);

  return {
    isoDate,
    displayDate,
    weekdayEnglish,
    weekdayGujarati,
  };
}

/**
 * Safe image loader that handles cached images and data URLs reliably
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Only set crossOrigin for remote URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}`));
    img.src = src;

    // In case the image is already complete (cached)
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
    }
  });
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
 * Render the complete poster onto a canvas element synchronously and quickly
 */
export function renderPosterToCanvas(
  canvas: HTMLCanvasElement,
  photoImg: HTMLImageElement,
  overlayImg: HTMLImageElement,
  dateInfo: { displayDate: string; weekdayGujarati: string },
  transform: ImageTransform = DEFAULT_TRANSFORM
): void {
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context');
  }

  // 1. Fill canvas with the warm cream temple background
  ctx.fillStyle = '#fef5e3';
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  // 2. Draw user photo clipped to the rounded photo frame
  ctx.save();
  ctx.beginPath();
  const { left, top, width, height, cornerRadius } = PHOTO_FRAME;
  drawRoundedRect(ctx, left, top, width, height, cornerRadius);
  ctx.clip();

  // Background for photo frame while image is fitting
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(left, top, width, height);

  // Center coordinates of the photo window
  const frameCenterX = left + width / 2;
  const frameCenterY = top + height / 2;

  ctx.translate(frameCenterX + transform.panX, frameCenterY + transform.panY);
  ctx.rotate((transform.rotation * Math.PI) / 180);

  // Calculate cover scaling
  const photoW = photoImg.naturalWidth || photoImg.width || 800;
  const photoH = photoImg.naturalHeight || photoImg.height || 800;

  // Account for 90 or 270 deg rotation swapping effective width/height
  const isRotated = transform.rotation % 180 !== 0;
  const effectiveW = isRotated ? photoH : photoW;
  const effectiveH = isRotated ? photoW : photoH;

  const scaleToCover = Math.max(width / effectiveW, height / effectiveH);
  const finalScale = scaleToCover * transform.zoom;

  const drawW = photoW * finalScale;
  const drawH = photoH * finalScale;

  ctx.drawImage(photoImg, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // 3. Draw the master template overlay (frames, logo, typography, icons)
  ctx.drawImage(overlayImg, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  // 4. Draw the Dynamic Date text inside date pill
  ctx.save();
  ctx.fillStyle = DATE_CONFIG.color;
  ctx.font = `${DATE_CONFIG.fontWeight} ${DATE_CONFIG.fontSize}px ${DATE_CONFIG.fontFamily}`;
  ctx.textBaseline = DATE_CONFIG.baseline;
  ctx.textAlign = DATE_CONFIG.align;
  ctx.fillText(dateInfo.displayDate, DATE_CONFIG.x, DATE_CONFIG.y);
  ctx.restore();

  // 5. Draw the Dynamic Gujarati Weekday text with auto-fitting between ribbon lotuses
  drawAutoFitText(
    ctx,
    dateInfo.weekdayGujarati,
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
 * Trigger high quality PNG download
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
