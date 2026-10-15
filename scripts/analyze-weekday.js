const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('public/assets/original-weekday-close.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Find where the white text 'ગુરુવાર' is:
  let minX = 999, maxX = -1, minY = 999, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 70; x < w - 70; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] > 220 && data[idx+1] > 220 && data[idx+2] > 220) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`Weekday text in crop: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);
  console.log(`Global weekday text: x=[${320+minX}, ${320+maxX}], y=[${1220+minY}, ${1220+maxY}]`);

  // Left lotus and right lotus bounds
  let leftLotusMinX = 999, leftLotusMaxX = -1;
  let rightLotusMinX = 999, rightLotusMaxX = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < 90; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] > 230 && data[idx+1] > 230 && data[idx+2] > 230) {
        if (x < leftLotusMinX) leftLotusMinX = x;
        if (x > leftLotusMaxX) leftLotusMaxX = x;
      }
    }
    for (let x = w - 90; x < w; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] > 230 && data[idx+1] > 230 && data[idx+2] > 230) {
        if (x < rightLotusMinX) rightLotusMinX = x;
        if (x > rightLotusMaxX) rightLotusMaxX = x;
      }
    }
  }
  console.log(`Left lotus in crop: x=[${leftLotusMinX}, ${leftLotusMaxX}] (global: [${320+leftLotusMinX}, ${320+leftLotusMaxX}])`);
  console.log(`Right lotus in crop: x=[${rightLotusMinX}, ${rightLotusMaxX}] (global: [${320+rightLotusMinX}, ${320+rightLotusMaxX}])`);

  // Sample the red ribbon background colors
  const bgColors = [];
  for (let x = 120; x < 150; x++) {
    const idx = (35 * w + x) * 3;
    bgColors.push([data[idx], data[idx+1], data[idx+2]]);
  }
  console.log('Sample background RGB:', bgColors[0]);
}

main().catch(console.error);
