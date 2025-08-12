// client/src/app/game/solo/page.js
"use client";
import GameModeCarousel from "@/components/GameModeCarousel";

export default function SoloGamesPage() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Solo Games</h1>
      <GameModeCarousel />
    </div>
  );
}
