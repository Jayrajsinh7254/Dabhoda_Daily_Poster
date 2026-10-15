const sharp = require('sharp');

async function extractCrops() {
  const img = sharp('public/assets/daily-darshan-template.png');
  
  // Crop 1: Date pill region (x: 280 to 800, y: 1140 to 1230)
  await img.clone().extract({ left: 280, top: 1140, width: 520, height: 90 })
    .toFile('public/assets/debug-date-pill.png');

  // Crop 2: Weekday pill region (x: 320 to 760, y: 1220 to 1290)
  await img.clone().extract({ left: 320, top: 1220, width: 440, height: 70 })
    .toFile('public/assets/debug-weekday-pill.png');

  // Crop 3: Photo top edge and header transition (x: 140 to 940, y: 280 to 440)
  await img.clone().extract({ left: 140, top: 280, width: 800, height: 160 })
    .toFile('public/assets/debug-top-edge.png');

  console.log('Debug crops extracted!');
}

extractCrops().catch(console.error);
