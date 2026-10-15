const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('public/assets/daily-darshan-template.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  function isCream(x, y) {
    const idx = (y * w + x) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    return (r > 240 && g > 230 && b > 210);
  }

  // Left vertical edge at y = 700
  let leftX = -1;
  for (let x = 100; x < 250; x++) {
    if (!isCream(x, 700)) {
      leftX = x;
      break;
    }
  }

  // Right vertical edge at y = 700
  let rightX = -1;
  for (let x = 1000; x > 850; x--) {
    if (!isCream(x, 700)) {
      rightX = x;
      break;
    }
  }

  // Top horizontal edge at x = 500
  let topY = -1;
  for (let y = 350; y < 450; y++) {
    if (!isCream(500, y)) {
      topY = y;
      break;
    }
  }

  // Bottom horizontal edge at x = 200
  let botY = -1;
  for (let y = 1260; y > 1150; y--) {
    if (!isCream(200, y)) {
      botY = y;
      break;
    }
  }

  // Corner radius calculation at top-left
  // Find (x, y) pairs on the curve
  console.log(`Straight bounds: left=${leftX}, right=${rightX}, width=${rightX - leftX + 1}`);
  console.log(`Straight bounds: top=${topY}, bottom=${botY}, height=${botY - topY + 1}`);

  // Let's check where the curve departs from straight line:
  // Along top edge y = topY:
  let curveStartX = -1;
  for (let x = leftX; x < leftX + 100; x++) {
    if (!isCream(x, topY)) {
      curveStartX = x;
      break;
    }
  }
  // Along left edge x = leftX:
  let curveStartY = -1;
  for (let y = topY; y < topY + 100; y++) {
    if (!isCream(leftX, y)) {
      curveStartY = y;
      break;
    }
  }

  console.log(`Top-left corner curve starts at x=${curveStartX} (offset ${curveStartX - leftX}), y=${curveStartY} (offset ${curveStartY - topY})`);
  const radius = Math.round(((curveStartX - leftX) + (curveStartY - topY)) / 2);
  console.log(`Estimated corner radius: ${radius}px`);
}

main().catch(console.error);
