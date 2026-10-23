"use client";

import React, { useState } from "react";
import PosterGenerator from "@/components/PosterGenerator";
import AartiVideoGenerator from "@/components/AartiVideoGenerator";
import { Image as ImageIcon, Flame, Sparkles } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"poster" | "video">("poster");

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-100 flex flex-col justify-between">
      {/* Sacred Top Decorative Header Band */}
      <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 py-1.5 px-4 text-center text-xs font-semibold tracking-wider text-amber-100 shadow-md flex items-center justify-center gap-3">
        <span>॥ જય શ્રી રામ ॥</span>
        <span className="opacity-60">•</span>
        <span>॥ જય શ્રી હનુમાન ॥</span>
        <span className="opacity-60">•</span>
        <span>॥ કષ્ટભંજન દેવ ॥</span>
      </div>

      <div className="w-full flex-1 flex flex-col items-center pt-6 px-3 sm:px-6">
        {/* Top Temple Branding */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Asia/Kolkata IST • Official Media Generator</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 font-devotional mb-2">
            શ્રી ડભોડીયા હનુમાનજી
          </h1>
          <p className="text-sm sm:text-base text-stone-300">
            દૈનિક સોશિયલ મીડિયા પોર્ટલ (ડભોડા, ગાંધીનગર)
          </p>

          {/* Devotional Mode Navigation Tabs */}
          <div className="mt-5 flex flex-col sm:flex-row w-full sm:w-auto max-w-md mx-auto p-1.5 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl backdrop-blur-md gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("poster")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "poster"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-lg font-bold"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>૧. દૈનિક દર્શન પોસ્ટર (Photo)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "video"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-lg font-bold"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
              }`}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>૨. દૈનિક આરતી વિડીયો (Video)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Generator Section */}
        {activeTab === "poster" ? (
          <PosterGenerator hideHeader />
        ) : (
          <AartiVideoGenerator />
        )}
      </div>

      {/* Devotional Footer */}
      <footer className="w-full border-t border-stone-800/80 bg-stone-950/80 backdrop-blur-md py-6 text-center text-xs text-stone-400 space-y-1">
        <p className="font-gujarati text-stone-300">
          ॥ શ્રી હનુમાનજી મંદિર ટ્રસ્ટ, ડભોડા - ગાંધીનગર ॥
        </p>
        <p className="font-mono text-[11px] text-stone-400">
          Mo: 9091801818 • Social: @DABHODIYA_HANUMANJI_OFFICIAL
        </p>
        <p className="text-[10px] text-stone-400">
          100% Client-side HTML Canvas image &amp; video processing. No media files are ever stored on any server.
        </p>
      </footer>
    </main>
  );
}
