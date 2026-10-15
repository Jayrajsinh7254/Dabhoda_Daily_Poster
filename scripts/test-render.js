const sharp = require('sharp');

function getPillTop(x) {
  if (x >= 350 && x <= 736) return 1154;
  if (x >= 322 && x < 350) return 1166;
  if (x > 736 && x <= 764) return 1166;
  if (x >= 305 && x < 322) return 1176;
  if (x > 764 && x <= 780) return 1176;
  return 9999;
}

async function prepareTemplate() {
  const original = await sharp('public/assets/daily-darshan-template.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;
  const data = original.data;

  // 1. Clean date numbers in pill: x: 521 to 718, y: 1162 to 1202
  for (let y = 1162; y <= 1202; y++) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let x = 508; x <= 520; x++) {
      const idx = (y * w + x) * 4;
      sumR += data[idx];
      sumG += data[idx+1];
      sumB += data[idx+2];
      count++;
    }
    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    for (let x = 521; x <= 718; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = avgR;
      data[idx+1] = avgG;
      data[idx+2] = avgB;
      data[idx+3] = 255;
    }
  }

  // 2. Clean weekday ribbon:
  // Left lotus ends at x = 422
  // Right lotus starts at x = 675
  // We sample from pure red region at x = 715..725 (to the right of right lotus):
  for (let y = 1228; y <= 1272; y++) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let x = 715; x <= 725; x++) {
      const idx = (y * w + x) * 4;
      sumR += data[idx];
      sumG += data[idx+1];
      sumB += data[idx+2];
      count++;
    }
    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    for (let x = 425; x <= 672; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = avgR;
      data[idx+1] = avgG;
      data[idx+2] = avgB;
      data[idx+3] = 255;
    }
  }

  // 3. Transparent cutout for photo:
  const photoLeft = 157;
  const photoRight = 959;
  const photoTop = 427;
  const photoBottom = 1211;
  const r = 25;

  for (let y = photoTop; y <= photoBottom; y++) {
    for (let x = photoLeft; x <= photoRight; x++) {
      let isInsidePhoto = true;

      if (x < photoLeft + r && y < photoTop + r) {
        const dx = (photoLeft + r) - x;
        const dy = (photoTop + r) - y;
        if (dx * dx + dy * dy > r * r) isInsidePhoto = false;
      } else if (x > photoRight - r && y < photoTop + r) {
        const dx = x - (photoRight - r);
        const dy = (photoTop + r) - y;
        if (dx * dx + dy * dy > r * r) isInsidePhoto = false;
      } else if (x < photoLeft + r && y > photoBottom - r) {
        const dx = (photoLeft + r) - x;
        const dy = y - (photoBottom - r);
        if (dx * dx + dy * dy > r * r) isInsidePhoto = false;
      } else if (x > photoRight - r && y > photoBottom - r) {
        const dx = x - (photoRight - r);
        const dy = y - (photoBottom - r);
        if (dx * dx + dy * dy > r * r) isInsidePhoto = false;
      }

      if (isInsidePhoto) {
        const topOfPill = getPillTop(x);
        if (y < topOfPill) {
          const idx = (y * w + x) * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile('public/assets/template-overlay.png');

  console.log('Template overlay created with pure red ribbon!');
}

async function renderTestPoster() {
  await prepareTemplate();

  const idolBuffer = await sharp('public/assets/default-idol.jpg')
    .resize(804, 786, { fit: 'cover' })
    .toBuffer();

  const svgText = Buffer.from(`
    <svg width="1086" height="1448">
      <style>
        .dateText { font-family: 'Arial', sans-serif; font-size: 32px; font-weight: bold; fill: #1a1a1a; }
        .weekdayText { font-family: 'Noto Sans Gujarati', 'Shruti', 'Gujarati MT', sans-serif; font-size: 38px; font-weight: bold; fill: #ffffff; text-anchor: middle; }
      </style>
      <text x="538" y="1195" class="dateText">14/10/2026</text>
      <text x="548" y="1257" class="weekdayText">બુધવાર</text>
    </svg>
  `);

  await sharp({
    create: {
      width: 1086,
      height: 1448,
      channels: 4,
      background: { r: 254, g: 245, b: 227, alpha: 1 }
    }
  })
    .composite([
      { input: idolBuffer, left: 157, top: 427 },
      { input: 'public/assets/template-overlay.png', left: 0, top: 0 },
      { input: svgText, left: 0, top: 0 }
    ])
    .png()
    .toFile('public/assets/test-final-poster.png');

  console.log('Generated test-final-poster.png successfully!');
}

renderTestPoster().catch(console.error);
