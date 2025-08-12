// client/src/app/game/battle/[gameId]/page.js
"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { GAMES } from "@/data/games";
import useApi from "@/hooks/useApi";

export default function BattleGameRoomsPage() {
  const api = useApi();
  const router = useRouter();
  const { gameId } = useParams();
  const gconf = GAMES.find((g) => g.id === gameId);

  const [rooms, setRooms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [betAmount, setBetAmount] = useState(gconf?.minBet || 0);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinId, setJoinId] = useState("");

  async function fetchRooms() {
    try {
      const list = await api.get(`/pvp/rooms?game=${encodeURIComponent(gameId)}`);
      setRooms(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Fetch rooms error:", e);
      setRooms([]);
    }
  }

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function createRoom() {
    try {
      setCreating(true);
      const room = await api.post("/pvp/create", {
        game: gameId,
        betAmount,
        maxPlayers,
      });
      if (!room?.roomId) {
        alert("Create room failed.");
        await fetchRooms();
        return;
      }
      router.push(`/game/battle/room/${room.roomId}`);
    } catch (e) {
      console.error("Create room error:", e);
      alert(e.message || "Create room failed");
      await fetchRooms();
    } finally {
      setCreating(false);
      setShowCreate(false);
    }
  }

  async function joinById() {
    if (!joinId) return;
    try {
      await api.post(`/pvp/join/${joinId}`);
      router.push(`/game/battle/room/${joinId}`);
    } catch (e) {
      console.error("Join room error:", e);
      alert(e.message || "Join room failed");
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/game/battle" className="text-sm underline">
            Back
          </Link>
          <h1 className="text-2xl font-semibold">Battle — {gconf?.name || gameId}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 rounded-xl border shadow" onClick={fetchRooms}>
            Refresh List
          </button>
          <div className="flex gap-2">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Enter Room ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button className="px-3 py-2 rounded-xl border shadow" onClick={joinById}>
              Join Room
            </button>
          </div>
          <button
            className="px-3 py-2 rounded-xl border shadow"
            onClick={() => setShowCreate(true)}
          >
            Create Room
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.roomId} className="rounded-2xl border shadow p-4">
            <div className="text-sm opacity-70">{r.game}</div>
            <div className="text-lg font-semibold">Room: {r.roomId.slice(0, 8)}</div>
            <div className="text-sm">Bet: {r.betAmount}</div>
            <div className="text-sm">Players: {r.players?.length}/{r.maxPlayers}</div>
            <div className="text-sm">Status: {r.status}</div>
            <button
              onClick={async () => {
                try {
                  await api.post(`/pvp/${r.roomId}/join`);
                  router.push(`/game/battle/room/${r.roomId}`);
                } catch (e) {
                  console.error("Join card error:", e);
                  alert(e.message || "Join failed");
                }
              }}
              className="mt-3 px-3 py-2 rounded-xl border shadow w-full"
            >
              Join
            </button>
          </div>
        ))}
        {!rooms.length && <div className="opacity-70">No waiting rooms right now.</div>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="text-lg font-semibold mb-3">Create Room</div>
            <div className="space-y-3">
              <div>
                <div className="text-sm mb-1">Bet Amount</div>
                <input
                  type="number"
                  min={gconf?.minBet || 0}
                  className="border rounded-xl px-3 py-2 w-full"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value || "0"))}
                />
              </div>
              <div>
                <div className="text-sm mb-1">Number of participants</div>
                <input
                  type="number"
                  min={2}
                  max={6}
                  className="border rounded-xl px-3 py-2 w-full"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value || "2", 10))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="px-3 py-2 rounded-xl border shadow" disabled={creating} onClick={createRoom}>
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
