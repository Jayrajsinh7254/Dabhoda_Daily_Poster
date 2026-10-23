const sharp = require('sharp');

async function test464x832Overlay() {
  console.log('Generating 464x832 Aarti Video Overlay...');
  
  const original = await sharp('public/assets/daily-darshan-template.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = original.info.width;
  const h = original.info.height;
  const data = original.data;

  // 1. Heal Date pill (x=530..705, y=1166..1204)
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

  // 2. Heal Weekday ribbon (x=470..625, y=1228..1272)
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

  // 3. Cutout specifically for 464 x 832 Frame:
  // Width: 464 -> Left: (1086 - 464)/2 = 311, Right: 775
  // Top: 427, Height: 832 -> Bottom: 1259
  // The Date pill starts at y=1154 and red ribbon at y=1228
  // Below y=1154, the pill and ribbon are OPAQUE.
  // Left curtain (x < 311) and right curtain (x > 775) REMAIN 100% OPAQUE!
  const vLeft = 311;
  const vRight = 775;
  const vTop = 427;
  const vBottom = 427 + 832; // 1259

  for (let y = vTop; y <= vBottom; y++) {
    for (let x = vLeft; x <= vRight; x++) {
      // Keep date pill (y >= 1154) and red ribbon 100% opaque
      if (y >= 1154) continue;

      const idx = (y * w + x) * 4;
      data[idx + 3] = 0; // Transparent cutout for 464x832 video
    }
  }

  console.log('Writing public/assets/template-aarti-464x832.png...');
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile('public/assets/template-aarti-464x832.png');

  // Overview resize to inspect
  await sharp('public/assets/template-aarti-464x832.png')
    .resize(400)
    .toFile('public/assets/inspect-464x832-overview.png');

  console.log('Done creating 464x832 overlay!');
}

test464x832Overlay().catch(console.error);
