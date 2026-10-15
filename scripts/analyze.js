const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('public/assets/daily-darshan-template.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const w = info.width;
  const h = info.height;
  console.log(`Dimensions: ${w}x${h}`);

  // Find left border of the photo at y = 600
  // Background on the left is light cream (R~255, G~248, B~235)
  // Photo curtain on left is darker (R~120-150)
  for (let x = 50; x < 300; x++) {
    const idx = (600 * w + x) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r < 200 || g < 200) {
      console.log(`Left edge around x=${x}, RGB=(${r},${g},${b})`);
      break;
    }
  }

  // Find right border of photo at y = 600
  for (let x = 1000; x > 750; x--) {
    const idx = (600 * w + x) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r < 200 || g < 200) {
      console.log(`Right edge around x=${x}, RGB=(${r},${g},${b})`);
      break;
    }
  }

  // Find top edge of photo at x = 543
  for (let y = 300; y < 600; y++) {
    const idx = (y * w + 543) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // Above photo is cream background: r>240, g>230
    if (r < 220 || g < 220) {
      console.log(`Top edge around y=${y}, RGB=(${r},${g},${b})`);
      break;
    }
  }

  // Find bottom edge of photo at x = 200 (left curtain bottom)
  for (let y = 1000; y < 1300; y++) {
    const idx = (y * w + 200) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // Below photo is cream background or footer
    if (r > 240 && g > 230 && b > 210) {
      console.log(`Bottom edge around y=${y}, RGB=(${r},${g},${b})`);
      break;
    }
  }

  // Inspect the date pill banner region:
  // "તારીખ : 14/10/2026"
  // Let's sample colors in the center column x=543 from y=1100 to y=1300
  for (let y = 1100; y <= 1300; y += 10) {
    const idx = (y * w + 543) * 3;
    console.log(`y=${y}: RGB=(${data[idx]},${data[idx+1]},${data[idx+2]})`);
  }
}

main().catch(console.error);
