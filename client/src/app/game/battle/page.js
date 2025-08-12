// client/src/app/game/battle/page.js
"use client";
import { GAMES } from "@/data/games";
import Link from "next/link";

export default function BattleSelectPage() {
  const battleGames = GAMES.filter((g) => g.supports.includes("battle"));
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Battle — Select a game</h1>
        <Link href="/game" className="text-sm underline">
          Back
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {battleGames.map((g) => (
          <Link
            key={g.id}
            href={`/game/battle/${g.id}`}
            className="rounded-2xl border shadow p-4 hover:bg-gray-50"
          >
            <div className="text-3xl">{g.icon}</div>
            <div className="mt-2 font-semibold">{g.name}</div>
            <div className="text-sm opacity-70">Min bet: {g.minBet}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
