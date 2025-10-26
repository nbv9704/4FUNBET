// client/src/app/game/battle/page.js
"use client";

import RequireAuth from '@/components/RequireAuth'
import { GAMES } from "@/data/games";
import Link from "next/link";
import GameCard from "@/components/GameCard";

const HAS_THUMB = new Set(["coinflip", "dice", "blackjackdice"]);

function BattleSelectPage() {
  const battleGames = GAMES.filter((g) => g.supports.includes("battle"));
  const sorted = [...battleGames].sort((a, b) => {
    const aHas = HAS_THUMB.has(a.id) ? 1 : 0;
    const bHas = HAS_THUMB.has(b.id) ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Battle — Select a game</h1>
        <Link href="/game" className="text-sm underline">
          Back
        </Link>
      </div>

      {/* Đồng bộ lưới và card với Solo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 items-stretch">
        {sorted.map((g) => (
          <Link
            key={g.id}
            href={`/game/battle/${g.id}`}
            className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <GameCard mode={g.id} fluid />
          </Link>
        ))}
      </div>
    </div>
  );
}
export default RequireAuth(BattleSelectPage)