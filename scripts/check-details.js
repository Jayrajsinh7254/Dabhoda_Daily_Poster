const sharp = require('sharp');

async function checkDetails() {
  const { data, info } = await sharp('public/assets/daily-darshan-template.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Let's inspect multiple y levels across the photo width to check if it's a rounded rect
  // For y = 500, 600, 700, 800, 900, 1000:
  for (const y of [450, 500, 600, 700, 800, 900, 1000, 1100]) {
    let minX = -1, maxX = -1;
    for (let x = 100; x < 300; x++) {
      const idx = (y * w + x) * 3;
      // Background around here is cream > 240, 230, 210
      if (data[idx] < 210 || data[idx+1] < 210) {
        minX = x;
        break;
      }
    }
    for (let x = 980; x > 800; x--) {
      const idx = (y * w + x) * 3;
      if (data[idx] < 210 || data[idx+1] < 210) {
        maxX = x;
        break;
      }
    }
    console.log(`y=${y}: x=[${minX}, ${maxX}], width=${maxX - minX}`);
  }

  // Let's inspect top edge across different x values (e.g. 200, 300, 400, 543, 700, 800, 900)
  for (const x of [200, 250, 300, 400, 543, 700, 800, 850, 900]) {
    let topY = -1;
    for (let y = 340; y < 450; y++) {
      const idx = (y * w + x) * 3;
      if (data[idx] < 220 || data[idx+1] < 215) {
        topY = y;
        break;
      }
    }
    console.log(`x=${x}: topY=${topY}`);
  }

  // Check the bottom edge of the photo behind the date banner
  // Around x=180, 200 (left of date pill), x=900, 920 (right of date pill)
  for (const x of [180, 200, 250, 850, 900, 920]) {
    let botY = -1;
    for (let y = 1100; y < 1250; y++) {
      const idx = (y * w + x) * 3;
      // Below photo is cream
      if (data[idx] > 230 && data[idx+1] > 220 && data[idx+2] > 200) {
        botY = y;
        break;
      }
    }
    console.log(`x=${x}: botY=${botY}`);
  }

  // Check the Date pill bounds:
  // Let's find x range for date pill at y = 1180
  let dateMinX = -1, dateMaxX = -1;
  const dy = 1180;
  for (let x = 200; x < 500; x++) {
    const idx = (dy * w + x) * 3;
    // Outside pill at y=1180 is photo or cream:
    // The pill has a distinct outline/fill (translucent reddish/pink/cream or border)
  }
  // Let's print colors across dy=1185 from x=300 to x=800 in steps of 25
  console.log('--- Date line y=1185 ---');
  for (let x = 300; x <= 800; x += 25) {
    const idx = (1185 * w + x) * 3;
    console.log(`x=${x}: RGB=(${data[idx]},${data[idx+1]},${data[idx+2]})`);
  }

  // Check weekday line y=1255
  console.log('--- Weekday line y=1255 ---');
  for (let x = 300; x <= 800; x += 25) {
    const idx = (1255 * w + x) * 3;
    console.log(`x=${x}: RGB=(${data[idx]},${data[idx+1]},${data[idx+2]})`);
  }
}

checkDetails().catch(console.error);
