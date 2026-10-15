const sharp = require('sharp');

async function checkPillOutline() {
  const { data, info } = await sharp('public/assets/daily-darshan-template.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Let's find the top orange border of the date pill across x: 290 to 790
  // The border is orange (high R > 220, G around 100-140, low B < 40)
  const topBorderY = [];
  for (let x = 290; x <= 790; x += 10) {
    let borderY = -1;
    for (let y = 1140; y <= 1165; y++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // Orange border:
      if (r > 200 && g > 80 && g < 180 && b < 60) {
        borderY = y;
        break;
      }
    }
    topBorderY.push({ x, borderY });
  }
  console.log('Sample pill top border:', topBorderY);
}

checkPillOutline().catch(console.error);
