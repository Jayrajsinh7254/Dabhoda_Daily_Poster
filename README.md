# Daily Darshan Poster Generator (શ્રી ડભોડીયા હનુમાનજી મંદિર - ડભોડા)

A simple, fast, and mobile-first web application built for the social media team of **Shree Dabhodiya Hanumanji Temple** (ડભોડા, ગાંધીનગર).

The app allows the temple's media managers and sevaks to upload daily idol photographs, automatically generate authentic high-resolution posters with the current Indian Standard Time (IST) date and Gujarati weekday, preview the result, and download the finished PNG for sharing on WhatsApp and social media.

---

## 🌟 Key Features

- **100% Authentic Template Preservation**: Preserves the temple's official 1086 × 1448 px design, including Gujarati calligraphy ("શ્રી ડભોડીયા હનુમાનજી", "આજ ના દર્શન"), temple bells, ornate border motifs, lotuses, and contact information.
- **Client-Side Image Composition**: Uses HTML5 Canvas for real-time composition. Photos never leave the user's device—no servers, databases, or cloud storage involved.
- **Daily Aarti Video Generator (15-30s Reels & Status)**:
  - Upload temple aarti videos (MP4, MOV, WebM) directly from mobile cameras.
  - Video Trimming: Customize 15s or 30s clips tailored for WhatsApp Status.
  - Preset Aarti selection: **મંગળાઆરતી (Mangla Aarti)**, શ્રૃંગાર આરતી, રાજભોગ આરતી, સંધ્યા આરતી, શયન આરતી.
  - Audio mixing: Captures and preserves temple aarti chanting and bell audio.
  - Export in Classic Temple Frame (1086×1448) or Full-Screen 9:16 Story (1080×1920).
- **Automatic IST Date & Gujarati Weekday**: Computes the exact date and day in the `Asia/Kolkata` timezone with correct Gujarati names:
  - રવિવાર, સોમવાર, મંગળવાર, બુધવાર, ગુરુવાર, શુક્રવાર, શનિવાર
- **Date Override Option**: Convenient date picker to schedule posters for festivals or next-day darshan in advance.
- **Interactive Photo & Video Positioning**:
  - Direct touch / mouse drag & pan inside the canvas preview.
  - Smooth zoom slider (1× to 3×).
  - Fine directional controls (Up, Down, Left, Right).
  - 90° clockwise rotation button.
  - One-click "Reset Alignment" button.
- **Pre-Loaded Default Idol**: Pre-loaded with the authentic idol photograph so the poster is ready to inspect immediately upon loading.
- **High-Resolution Export**: Exports lossless 1086 × 1448 px PNG files and HD video files optimized for WhatsApp Status, Instagram, and Facebook.
- **Mobile-First Devotional UI**: Designed with warm saffron/amber tones (`#f59e0b`, `#dc2626`, `#0f1117`), intuitive controls, full-screen preview modal, and accessible typography.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Version 16.4)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Graphics Engine**: HTML5 2D Canvas API
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: Google Fonts via `next/font/google`:
  - `Noto Sans Gujarati` (Gujarati calligraphy & weekday names)
  - `Outfit` (Clean modern UI numbers & text)
  - `Rozha One` (Sacred serif accents)

---

## 📱 Daily Workflow

1. **Open the web application** on any phone, tablet, or desktop browser.
2. **Upload today's idol photograph** (JPG, JPEG, PNG, or WebP) or click "Replace Image".
3. **Adjust positioning** using intuitive pinch/drag, zoom slider, or 90° rotation as needed.
4. **Verify date & Gujarati weekday** (auto-populated according to Indian Standard Time, or overridden manually).
5. **Inspect the live preview** (click "View Fullscreen" for high-resolution inspection).
6. **Click "Download Poster (PNG)"** to save the finished 1086 × 1448 px image.
7. **Share on WhatsApp** directly to groups and status!

---

## 🚀 Local Development

### Prerequisites
- Node.js 18.18.0 or later installed.
- npm (comes bundled with Node.js).

### Getting Started

1. Clone or extract the project repository:
   ```bash
   cd DabhodiyaHanuman-PosterGenerator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   *(Or specify an explicit port if 3000 is occupied: `npx next dev --port 3010`)*

4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

### Building for Production
Test the production build locally:
```bash
npm run build
npm run start
```

---

## 🌐 Deploying to Vercel

The application is completely static and serverless-ready, making deployment on **Vercel** instant and free.

### Option 1: Vercel Dashboard (Recommended)

1. Push this project repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Log into [vercel.com](https://vercel.com/) and click **"Add New Project"**.
3. Select your repository from the list.
4. Leave all build settings at their defaults:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Click **"Deploy"**.
6. Your live web app will be ready in under 1 minute with global CDN caching and HTTPS.

*Note: No environment variables or database connections are required.*

### Option 2: Vercel CLI

If you have the Vercel CLI installed:
```bash
npm i -g vercel
vercel
```
Follow the interactive prompts to link and deploy your project.

---

## 🔒 Privacy & Security

- **Strictly Offline Processing**: All image transformations, masking, and text compositing happen strictly in the client's browser memory.
- **Zero Photo Persistence**: Images are released from memory as soon as the session ends or when a new photo is loaded.
- **No Third-Party Trackers**: No analytics or external tracking scripts.

---

## 🏛️ Temple Information

**Shree Dabhodiya Hanumanji Temple**  
Dabhoda, Taluka Gandhinagar, District Gandhinagar, Gujarat - 382355  
Website / WhatsApp Media Generation Portal
