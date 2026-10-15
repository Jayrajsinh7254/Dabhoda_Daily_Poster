const sharp = require('sharp');

function getPillTop(x) {
  if (x >= 350 && x <= 736) return 1154;
  if (x >= 322 && x < 350) return 1166;
  if (x > 736 && x <= 764) return 1166;
  if (x >= 305 && x < 322) return 1176;
  if (x > 764 && x <= 780) return 1176;
  // Outside pill is photo -> transparent down to photo bottom
  return 9999;
}

async function createOverlay() {
  const original = await sharp('public/assets/daily-darshan-template.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;
  const data = original.data;

  // 1. Clean date numbers in pill:
  // x: 524 to 715, y: 1162 to 1202
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
  // x: 416 to 678, y: 1228 to 1272
  for (let y = 1228; y <= 1272; y++) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let x = 404; x <= 412; x++) {
      const idx = (y * w + x) * 4;
      sumR += data[idx];
      sumG += data[idx+1];
      sumB += data[idx+2];
      count++;
    }
    for (let x = 684; x <= 692; x++) {
      const idx = (y * w + x) * 4;
      sumR += data[idx];
      sumG += data[idx+1];
      sumB += data[idx+2];
      count++;
    }
    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    for (let x = 413; x <= 683; x++) {
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
          data[idx + 3] = 0;
        }
      }
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile('public/assets/template-overlay.png');

  await sharp('public/assets/template-overlay.png')
    .extract({ left: 250, top: 1130, width: 580, height: 160 })
    .toFile('public/assets/debug-overlay-pills.png');

  console.log('Done with 9999 pill top!');
}

createOverlay().catch(console.error);
