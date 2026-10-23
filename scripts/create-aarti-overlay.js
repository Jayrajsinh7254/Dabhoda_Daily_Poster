const sharp = require('sharp');

async function createAartiOverlay() {
  console.log('Generating template-aarti-overlay.png...');
  
  // 1. Read master template
  const original = await sharp('public/assets/daily-darshan-template.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;
  const data = original.data;

  // ----------------------------------------------------
  // A. HEAL 'આજ ના દર્શન' AND REPLACE WITH 'આજ ની આરતી'
  // Bounds of 'આજ ના દર્શન': x=395..660, y=330..385
  // The background is cream with soft gradient (RGB: 254, 243, 218)
  // ----------------------------------------------------
  const subY1 = 330, subY2 = 385;
  const subX1 = 390, subX2 = 665;

  for (let y = subY1; y <= subY2; y++) {
    // Left reference sample at x=370..380
    let leftR = 0, leftG = 0, leftB = 0, countL = 0;
    for (let x = 370; x <= 380; x++) {
      const idx = (y * w + x) * 4;
      leftR += data[idx]; leftG += data[idx+1]; leftB += data[idx+2];
      countL++;
    }
    leftR /= countL; leftG /= countL; leftB /= countL;

    // Right reference sample at x=675..685
    let rightR = 0, rightG = 0, rightB = 0, countR = 0;
    for (let x = 675; x <= 685; x++) {
      const idx = (y * w + x) * 4;
      rightR += data[idx]; rightG += data[idx+1]; rightB += data[idx+2];
      countR++;
    }
    rightR /= countR; rightG /= countR; rightB /= countR;

    for (let x = subX1; x <= subX2; x++) {
      const t = (x - subX1) / (subX2 - subX1);
      const targetR = leftR * (1 - t) + rightR * t;
      const targetG = leftG * (1 - t) + rightG * t;
      const targetB = leftB * (1 - t) + rightB * t;

      const idx = (y * w + x) * 4;
      const curR = data[idx], curG = data[idx+1], curB = data[idx+2];
      
      // If it's the golden-ochre text (R > 140, G < 140, B < 60) or edge
      const isText = (curB < 100 || curG < 160 || (curR - curB > 80));
      if (isText) {
        const noise = (((x * 19 + y * 23) % 5) - 2) * 0.7;
        data[idx] = Math.round(targetR + noise);
        data[idx+1] = Math.round(targetG + noise);
        data[idx+2] = Math.round(targetB + noise);
        data[idx+3] = 255;
      }
    }
  }

  // ----------------------------------------------------
  // B. HEAL DATE PILL (x=530..705, y=1166..1204)
  // ----------------------------------------------------
  const dateYStart = 1166, dateYEnd = 1204;
  const dateX1 = 530, dateX2 = 705;

  for (let y = dateYStart; y <= dateYEnd; y++) {
    let leftR = 0, leftG = 0, leftB = 0, leftCount = 0;
    for (let x = 525; x <= 529; x++) {
      const idx = (y * w + x) * 4;
      leftR += data[idx]; leftG += data[idx+1]; leftB += data[idx+2]; leftCount++;
    }
    leftR /= leftCount; leftG /= leftCount; leftB /= leftCount;

    let rightR = 0, rightG = 0, rightB = 0, rightCount = 0;
    for (let x = 706; x <= 710; x++) {
      const idx = (y * w + x) * 4;
      rightR += data[idx]; rightG += data[idx+1]; rightB += data[idx+2]; rightCount++;
    }
    rightR /= rightCount; rightG /= rightCount; rightB /= rightCount;

    let vFeather = 1.0;
    if (y < 1169) vFeather = (y - 1166 + 1) / 4.0;
    else if (y > 1201) vFeather = (1204 - y + 1) / 4.0;

    for (let x = dateX1; x <= dateX2; x++) {
      const t = (x - dateX1) / (dateX2 - dateX1);
      const targetR = leftR * (1 - t) + rightR * t;
      const targetG = leftG * (1 - t) + rightG * t;
      const targetB = leftB * (1 - t) + rightB * t;

      let hFeather = 1.0;
      if (x < 536) hFeather = (x - dateX1) / 6.0;
      else if (x > 698) hFeather = (dateX2 - x) / 7.0;

      const feather = Math.max(0, Math.min(1, vFeather * hFeather));
      const idx = (y * w + x) * 4;
      const noise = (((x * 17 + y * 31) % 5) - 2) * 0.8;

      data[idx] = Math.round(data[idx] * (1 - feather) + (targetR + noise) * feather);
      data[idx+1] = Math.round(data[idx+1] * (1 - feather) + (targetG + noise) * feather);
      data[idx+2] = Math.round(data[idx+2] * (1 - feather) + (targetB + noise) * feather);
      data[idx+3] = 255;
    }
  }

  // ----------------------------------------------------
  // C. HEAL WEEKDAY RIBBON (x=470..625, y=1228..1272)
  // ----------------------------------------------------
  const weekYStart = 1228, weekYEnd = 1272;
  const weekX1 = 470, weekX2 = 625;

  for (let y = weekYStart; y <= weekYEnd; y++) {
    let leftR = 0, leftG = 0, leftB = 0, leftCount = 0;
    for (let x = 460; x <= 465; x++) {
      const idx = (y * w + x) * 4;
      leftR += data[idx]; leftG += data[idx+1]; leftB += data[idx+2]; leftCount++;
    }
    leftR /= leftCount; leftG /= leftCount; leftB /= leftCount;

    let rightR = 0, rightG = 0, rightB = 0, rightCount = 0;
    for (let x = 630; x <= 635; x++) {
      const idx = (y * w + x) * 4;
      rightR += data[idx]; rightG += data[idx+1]; rightB += data[idx+2]; rightCount++;
    }
    rightR /= rightCount; rightG /= rightCount; rightB /= rightCount;

    let vFeather = 1.0;
    if (y < 1231) vFeather = (y - 1228 + 1) / 4.0;
    else if (y > 1269) vFeather = (1272 - y + 1) / 4.0;

    for (let x = weekX1; x <= weekX2; x++) {
      const t = (x - weekX1) / (weekX2 - weekX1);
      const targetR = leftR * (1 - t) + rightR * t;
      const targetG = leftG * (1 - t) + rightG * t;
      const targetB = leftB * (1 - t) + rightB * t;

      let hFeather = 1.0;
      if (x < 485) hFeather = (x - weekX1) / 15.0;
      else if (x > 610) hFeather = (weekX2 - x) / 15.0;

      const feather = Math.max(0, Math.min(1, vFeather * hFeather));
      const idx = (y * w + x) * 4;
      const noise = (((x * 23 + y * 29) % 5) - 2) * 0.7;

      data[idx] = Math.round(data[idx] * (1 - feather) + (targetR + noise) * feather);
      data[idx+1] = Math.round(data[idx+1] * (1 - feather) + (targetG + noise) * feather);
      data[idx+2] = Math.round(data[idx+2] * (1 - feather) + (targetB + noise) * feather);
      data[idx+3] = 255;
    }
  }

  // ----------------------------------------------------
  // D. TRANSPARENT CUTOUT FOR VIDEO
  // ----------------------------------------------------
  const photoLeft = 157;
  const photoRight = 959;
  const photoTop = 427;
  const photoBottom = 1211;
  const r = 25;

  function getCutoutBottomLimit(x) {
    if (x >= 355 && x <= 745) return 1154;
    if (x >= 330 && x < 355) {
      const t = (x - 330) / 25.0;
      return Math.round(1176 - t * 22);
    }
    if (x > 745 && x <= 770) {
      const t = (x - 745) / 25.0;
      return Math.round(1154 + t * 22);
    }
    if (x >= 180 && x <= 910) return 1176;
    return photoBottom;
  }

  for (let y = photoTop; y <= photoBottom; y++) {
    for (let x = photoLeft; x <= photoRight; x++) {
      const bottomLimit = getCutoutBottomLimit(x);
      if (y >= bottomLimit) continue;

      let isInside = true;
      if (x < photoLeft + r && y < photoTop + r) {
        const dx = (photoLeft + r) - x;
        const dy = (photoTop + r) - y;
        if (dx * dx + dy * dy > r * r) isInside = false;
      } else if (x > photoRight - r && y < photoTop + r) {
        const dx = x - (photoRight - r);
        const dy = (photoTop + r) - y;
        if (dx * dx + dy * dy > r * r) isInside = false;
      } else if (x < photoLeft + r && y > photoBottom - r) {
        const dx = (photoLeft + r) - x;
        const dy = y - (photoBottom - r);
        if (dx * dx + dy * dy > r * r) isInside = false;
      } else if (x > photoRight - r && y > photoBottom - r) {
        const dx = x - (photoRight - r);
        const dy = y - (photoBottom - r);
        if (dx * dx + dy * dy > r * r) isInside = false;
      }

      if (isInside) {
        const idx = (y * w + x) * 4;
        data[idx + 3] = 0;
      }
    }
  }

  // ----------------------------------------------------
  // E. OVERLAY "આજ ની આરતી" IN PLACE OF "આજ ના દર્શન"
  // ----------------------------------------------------
  const aartiSvg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="543" y="372"
          text-anchor="middle"
          font-family="'Noto Sans Gujarati', 'Gujarati MT', sans-serif"
          font-size="44px"
          font-weight="bold"
          fill="#c05f00"
          letter-spacing="1px">આજ ની આરતી</text>
  </svg>
  `;

  const intermediate = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();

  await sharp(intermediate)
    .composite([
      { input: Buffer.from(aartiSvg), top: 0, left: 0 }
    ])
    .png()
    .toFile('public/assets/template-aarti-overlay.png');

  console.log('Successfully created public/assets/template-aarti-overlay.png!');
}

createAartiOverlay().catch(console.error);
