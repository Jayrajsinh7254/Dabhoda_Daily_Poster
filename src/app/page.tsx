import PosterGenerator from "@/components/PosterGenerator";

export default function Home() {
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

      {/* Main Interactive Poster Generator */}
      <PosterGenerator />
    </main>
  );
}
