const sharp = require('sharp');

async function testComposite() {
  const displayDate = '14/10/2026';
  const weekdayGujarati = 'બુધવાર';

  const svgText = `
  <svg width="1086" height="1448" xmlns="http://www.w3.org/2000/svg">
    <style>
      .date-text {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 32px;
        font-weight: 700;
        fill: #16161b;
        letter-spacing: 0.8px;
      }
      .weekday-text {
        font-family: 'Noto Sans Gujarati', 'Shruti', sans-serif;
        font-size: 38px;
        font-weight: 700;
        fill: #ffffff;
        text-anchor: middle;
        filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.45));
      }
    </style>
    <!-- Baseline y=1196 leaves clean 8px above dividing line, matching original perfectly -->
    <text x="542" y="1196" class="date-text">${displayDate}</text>
    
    <!-- Weekday Text centered at x=552, y=1256 -->
    <text x="552" y="1256" class="weekday-text">${weekdayGujarati}</text>
  </svg>
  `;

  const compositeBuffer = await sharp('public/assets/template-overlay.png')
    .composite([
      { input: Buffer.from(svgText), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();

  await sharp(compositeBuffer)
    .extract({ left: 140, top: 1130, width: 800, height: 160 })
    .toFile('public/assets/inspect-fine-tuned.png');

  console.log('Fine-tuned created!');
}

testComposite().catch(console.error);
