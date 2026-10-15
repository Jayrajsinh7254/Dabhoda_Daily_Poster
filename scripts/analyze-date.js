const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('public/assets/debug-date-pill.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Let's find the text '14/10/2026':
  // In debug-date-pill: left: 280, top: 1140, width: 520, height: 90
  // Look only inside the pill interior: y from 25 to 60 (global 1165 to 1200)
  // And x from 200 to 500 (global 480 to 780)
  let minX = 999, maxX = -1, minY = 999, maxY = -1;
  for (let y = 25; y <= 60; y++) {
    for (let x = 200; x < 500; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] < 60 && data[idx+1] < 60 && data[idx+2] < 60) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Date numbers in crop: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);
  console.log(`Global date numbers: x=[${280+minX}, ${280+maxX}], y=[${1140+minY}, ${1140+maxY}]`);

  // Also let's check the 'તારીખ :' text bounds
  let tMinX = 999, tMaxX = -1;
  for (let y = 25; y <= 60; y++) {
    for (let x = 60; x < 200; x++) {
      const idx = (y * w + x) * 3;
      // Reddish text: r>180, g<80, b<40
      if (data[idx] > 180 && data[idx+1] < 80 && data[idx+2] < 40) {
        if (x < tMinX) tMinX = x;
        if (x > tMaxX) tMaxX = x;
      }
    }
  }
  console.log(`'તારીખ :' in crop: x=[${tMinX}, ${tMaxX}] (global: [${280+tMinX}, ${280+tMaxX}])`);

  // Sample pill background color around (300, 42) in crop
  const pIdx = (42 * w + 300) * 3;
  console.log(`Pill background RGB: [${data[pIdx]}, ${data[pIdx+1]}, ${data[pIdx+2]}]`);
}

main().catch(console.error);
