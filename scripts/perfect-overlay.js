const sharp = require('sharp');

async function buildPristineOverlay() {
  console.log('Reading master template...');
  const original = await sharp('public/assets/daily-darshan-template.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;
  const data = original.data;

  // ==========================================
  // 1. INPAINT DATE NUMBERS IN PILL
  // The numbers '14/10/2026' are in x=535..695, y=1166..1204
  // We feather blend horizontally from x=530 to 705.
  // Left sample reference: average of x=526..530
  // Right sample reference: average of x=705..710
  // ==========================================
  console.log('Healing date numbers in pill with smooth feathering...');
  const dateYStart = 1166;
  const dateYEnd = 1204;
  const dateX1 = 530;
  const dateX2 = 705;

  for (let y = dateYStart; y <= dateYEnd; y++) {
    let leftR = 0, leftG = 0, leftB = 0, leftCount = 0;
    for (let x = 525; x <= 529; x++) {
      const idx = (y * w + x) * 4;
      leftR += data[idx];
      leftG += data[idx+1];
      leftB += data[idx+2];
      leftCount++;
    }
    leftR /= leftCount;
    leftG /= leftCount;
    leftB /= leftCount;

    let rightR = 0, rightG = 0, rightB = 0, rightCount = 0;
    for (let x = 706; x <= 710; x++) {
      const idx = (y * w + x) * 4;
      rightR += data[idx];
      rightG += data[idx+1];
      rightB += data[idx+2];
      rightCount++;
    }
    rightR /= rightCount;
    rightG /= rightCount;
    rightB /= rightCount;

    // Soft cosine vertical feathering at y borders (y=1166..1168 and y=1202..1204)
    let vFeather = 1.0;
    if (y < 1169) {
      vFeather = (y - 1166 + 1) / 4.0;
    } else if (y > 1201) {
      vFeather = (1204 - y + 1) / 4.0;
    }

    for (let x = dateX1; x <= dateX2; x++) {
      // Horizontal linear interpolation
      const t = (x - dateX1) / (dateX2 - dateX1);
      const targetR = leftR * (1 - t) + rightR * t;
      const targetG = leftG * (1 - t) + rightG * t;
      const targetB = leftB * (1 - t) + rightB * t;

      // Horizontal feathering at ends (530..536 and 698..705)
      let hFeather = 1.0;
      if (x < 536) {
        hFeather = (x - dateX1) / 6.0;
      } else if (x > 698) {
        hFeather = (dateX2 - x) / 7.0;
      }

      const feather = Math.max(0, Math.min(1, vFeather * hFeather));

      const idx = (y * w + x) * 4;
      // Add subtle deterministic organic noise based on coordinate hash
      const noise = (((x * 17 + y * 31) % 5) - 2) * 0.8;

      data[idx] = Math.round(data[idx] * (1 - feather) + (targetR + noise) * feather);
      data[idx+1] = Math.round(data[idx+1] * (1 - feather) + (targetG + noise) * feather);
      data[idx+2] = Math.round(data[idx+2] * (1 - feather) + (targetB + noise) * feather);
      data[idx+3] = 255;
    }
  }

  // ==========================================
  // 2. INPAINT WEEKDAY TEXT IN RED RIBBON
  // The text 'ગુરુવાર' is in x=488..605, y=1228..1272.
  // Feather blend horizontally between x=470 and 625.
  // Left sample: x=460..465
  // Right sample: x=630..635
  // ==========================================
  console.log('Healing weekday text in red ribbon with smooth feathering...');
  const weekYStart = 1228;
  const weekYEnd = 1272;
  const weekX1 = 470;
  const weekX2 = 625;

  for (let y = weekYStart; y <= weekYEnd; y++) {
    let leftR = 0, leftG = 0, leftB = 0, leftCount = 0;
    for (let x = 460; x <= 465; x++) {
      const idx = (y * w + x) * 4;
      leftR += data[idx];
      leftG += data[idx+1];
      leftB += data[idx+2];
      leftCount++;
    }
    leftR /= leftCount;
    leftG /= leftCount;
    leftB /= leftCount;

    let rightR = 0, rightG = 0, rightB = 0, rightCount = 0;
    for (let x = 630; x <= 635; x++) {
      const idx = (y * w + x) * 4;
      rightR += data[idx];
      rightG += data[idx+1];
      rightB += data[idx+2];
      rightCount++;
    }
    rightR /= rightCount;
    rightG /= rightCount;
    rightB /= rightCount;

    // Vertical feathering at top (1228..1230) and bottom (1270..1272)
    let vFeather = 1.0;
    if (y < 1231) {
      vFeather = (y - 1228 + 1) / 4.0;
    } else if (y > 1269) {
      vFeather = (1272 - y + 1) / 4.0;
    }

    for (let x = weekX1; x <= weekX2; x++) {
      const t = (x - weekX1) / (weekX2 - weekX1);
      const targetR = leftR * (1 - t) + rightR * t;
      const targetG = leftG * (1 - t) + rightG * t;
      const targetB = leftB * (1 - t) + rightB * t;

      let hFeather = 1.0;
      if (x < 485) {
        hFeather = (x - weekX1) / 15.0;
      } else if (x > 610) {
        hFeather = (weekX2 - x) / 15.0;
      }

      const feather = Math.max(0, Math.min(1, vFeather * hFeather));

      const idx = (y * w + x) * 4;
      const noise = (((x * 23 + y * 29) % 5) - 2) * 0.7;

      data[idx] = Math.round(data[idx] * (1 - feather) + (targetR + noise) * feather);
      data[idx+1] = Math.round(data[idx+1] * (1 - feather) + (targetG + noise) * feather);
      data[idx+2] = Math.round(data[idx+2] * (1 - feather) + (targetB + noise) * feather);
      data[idx+3] = 255;
    }
  }

  // ==========================================
  // 3. TRANSPARENT CUTOUT FOR PHOTO
  // Photo Frame:
  // Left: 157, Right: 929, Top: 427, Corner Radius: 25
  // Date Pill & Weekday Ribbon protection:
  // The pill top outline is at y = 1154 from x=355 to 745,
  // curves down to y = 1176 at x=330 and 770,
  // and everything below y=1176 for x in 180..910 is OPAQUE (pill wings & flourishes).
  // Outside x in 180..910 (the far left and far right), the photo extends to y = 1211.
  // ==========================================
  console.log('Carving seamless photo cutout...');
  const photoLeft = 157;
  const photoRight = 959;
  const photoTop = 427;
  const photoBottom = 1211;
  const r = 25;

  function getCutoutBottomLimit(x) {
    if (x >= 355 && x <= 745) return 1154; // Flat top of pill
    if (x >= 330 && x < 355) {
      // Curve from (330, 1176) to (355, 1154)
      const t = (x - 330) / 25.0;
      return Math.round(1176 - t * 22);
    }
    if (x > 745 && x <= 770) {
      // Curve from (745, 1154) to (770, 1176)
      const t = (x - 745) / 25.0;
      return Math.round(1154 + t * 22);
    }
    if (x >= 180 && x <= 910) {
      // Pill bracket wings and flourishes are 100% solid below 1176
      return 1176;
    }
    // Outside the pill on the far left and right
    return photoBottom;
  }

  for (let y = photoTop; y <= photoBottom; y++) {
    for (let x = photoLeft; x <= photoRight; x++) {
      const bottomLimit = getCutoutBottomLimit(x);
      if (y >= bottomLimit) {
        continue; // Keep pill, flourish, and template opaque!
      }

      // Check 25px rounded corner mask
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
        data[idx + 3] = 0; // Transparent cutout for idol photo
      }
    }
  }

  console.log('Writing public/assets/template-overlay.png...');
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile('public/assets/template-overlay.png');

  // Closeup extraction for visual inspection
  await sharp('public/assets/template-overlay.png')
    .extract({ left: 140, top: 1130, width: 800, height: 160 })
    .toFile('public/assets/inspect-perfect-pill-ribbon.png');

  console.log('Completed successfully!');
}

buildPristineOverlay().catch(console.error);
