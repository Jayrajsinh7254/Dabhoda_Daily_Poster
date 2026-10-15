const sharp = require('sharp');

async function findPhotoBounds() {
  const { data, info } = await sharp('public/assets/daily-darshan-template.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Let's sample the background cream color right above the photo at (543, 300)
  const bgIdx = (300 * w + 543) * 3;
  const bgR = data[bgIdx], bgG = data[bgIdx+1], bgB = data[bgIdx+2];
  console.log(`Background sample: RGB(${bgR}, ${bgG}, ${bgB})`);

  // Check top edge along middle
  let photoTop = -1;
  for (let y = 280; y < 450; y++) {
    const idx = (y * w + 543) * 3;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
    if (diff > 40) {
      photoTop = y;
      break;
    }
  }

  // Check left edge along y = 600
  let photoLeft = -1;
  for (let x = 100; x < 250; x++) {
    const idx = (600 * w + x) * 3;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
    if (diff > 40) {
      photoLeft = x;
      break;
    }
  }

  // Check right edge along y = 600
  let photoRight = -1;
  for (let x = 980; x > 850; x--) {
    const idx = (600 * w + x) * 3;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
    if (diff > 40) {
      photoRight = x;
      break;
    }
  }

  // Check bottom edge of photo (at x = 170, just to the left of the date pill)
  let photoBottomLeft = -1;
  for (let y = 1100; y < 1250; y++) {
    const idx = (y * w + 170) * 3;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
    if (diff < 40) {
      photoBottomLeft = y;
      break;
    }
  }

  // Check bottom edge of photo at x = 940 (to the right of the date pill)
  let photoBottomRight = -1;
  for (let y = 1100; y < 1250; y++) {
    const idx = (y * w + 940) * 3;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
    if (diff < 40) {
      photoBottomRight = y;
      break;
    }
  }

  console.log({
    photoLeft,
    photoRight,
    photoWidth: photoRight - photoLeft + 1,
    photoTop,
    photoBottomLeft,
    photoBottomRight,
    photoHeight: photoBottomLeft - photoTop
  });
}

findPhotoBounds().catch(console.error);
