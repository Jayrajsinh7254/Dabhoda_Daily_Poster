import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Darshan Poster Generator | શ્રી ડભોડીયા હનુમાનજી મંદિર",
  description: "Official social media poster generator for Shree Dabhodiya Hanumanji Temple daily darshan. Mobile-first, browser-rendered high quality PNG generator.",
  keywords: ["Dabhodiya Hanumanji", "Daily Darshan", "Poster Generator", "Temple Social Media", "WhatsApp Status"],
  icons: {
    icon: "/assets/daily-darshan-template.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#b91c1c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="gu" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&family=Rozha+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-stone-900 text-stone-100 font-sans antialiased selection:bg-amber-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
