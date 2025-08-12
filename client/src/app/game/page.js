// client/src/app/game/page.js
"use client";
import Link from "next/link";

export default function GameHubPage() {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Game</h1>

      <div className="flex gap-3 mb-6">
        <Link href="/game/solo" className="px-4 py-2 rounded-2xl border shadow">
          Solo
        </Link>
        <Link href="/game/battle" className="px-4 py-2 rounded-2xl border shadow">
          Battle
        </Link>
      </div>

      <p className="opacity-70">
        Choose <b>Solo</b> for single-player games, or <b>Battle</b> for multiplayer rooms.
      </p>
    </div>
  );
}
