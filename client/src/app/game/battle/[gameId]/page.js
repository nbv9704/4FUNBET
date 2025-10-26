// client/src/app/game/battle/[gameId]/page.js
"use client";

import RequireAuth from '@/components/RequireAuth'
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { GAMES } from "@/data/games";
import useApi from "@/hooks/useApi";

const ALLOWED_SIDES = [4, 6, 8, 10, 12, 20];

function BattleGameRoomsPage() {
  const api = useApi();
  const router = useRouter();
  const { gameId } = useParams();
  const gconf = useMemo(() => GAMES.find((g) => g.id === gameId), [gameId]);

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [betAmount, setBetAmount] = useState(gconf?.minBet || 0);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinId, setJoinId] = useState("");

  // coinflip: host picks side
  const [hostSide, setHostSide] = useState("heads");
  // dice: host picks dice sides
  const [diceSides, setDiceSides] = useState(6);

  async function fetchRooms() {
    try {
      setLoadingRooms(true);
      const list = await api.get(`/pvp/rooms?game=${encodeURIComponent(gameId)}`);
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  useEffect(() => {
    setBetAmount(gconf?.minBet || 0);
    setMaxPlayers(gameId === "coinflip" ? 2 : 2);
    setHostSide("heads");
    setDiceSides(6);
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function createRoom() {
    try {
      setCreating(true);
      // coinflip: không gửi maxPlayers (server mặc định 2)
      const body =
        gameId === "coinflip"
          ? { game: gameId, betAmount, hostSide }
          : { game: gameId, betAmount, maxPlayers, ...(gameId === "dice" ? { diceSides } : {}) };

      const room = await api.post("/pvp/create", body);
      if (!room?.roomId) {
        await fetchRooms();
        return;
      }
      // Đóng modal & chuyển trang khi thành công (toast lỗi/thành công để useApi xử lý)
      setShowCreate(false);
      router.push(`/game/battle/room/${room.roomId}`);
    } catch {
      // Lỗi đã được useApi hiển thị toast
      await fetchRooms();
    } finally {
      setCreating(false);
    }
  }

  async function joinById() {
    if (!joinId) return;
    try {
      await api.post(`/pvp/join/${joinId}`);
      router.push(`/game/battle/room/${joinId}`);
    } catch {
      // Lỗi đã được useApi hiển thị toast
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
        {/* Skeleton cards khi đang load */}
        {loadingRooms &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`s-${i}`} className="rounded-2xl border shadow p-4">
              <div className="space-y-2">
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-16 rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-5 w-40 rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-24 rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-3 w-full rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-8 w-full rounded mt-3" />
              </div>
            </div>
          ))}

        {/* Danh sách phòng */}
        {rooms.map((r) => {
          const host = Array.isArray(r.players) && r.players.length ? r.players[0] : null;
          return (
            <div key={r.roomId} className="rounded-2xl border shadow p-4">
              <div className="text-sm opacity-70">{r.game}</div>
              <div className="text-lg font-semibold">Room: {r.roomId.slice(0, 8)}</div>
              <div className="text-sm">Bet: {r.betAmount}</div>
              {r?.metadata?.serverSeedHash && (
                <div className="text-xs opacity-70 mt-1 truncate">
                  Seed Hash: {r.metadata.serverSeedHash}
                </div>
              )}
              {r.game === "dice" && r?.metadata?.dice?.sides && (
                <div className="text-sm">Dice: d{r.metadata.dice.sides}</div>
              )}
              <div className="text-sm">Players: {r.players?.length}/{r.maxPlayers}</div>
              <div className="text-sm">Status: {r.status}</div>

              {r.game === "coinflip" && host?.side && (
                <div className="text-sm mt-1">
                  Host side: <b>{String(host.side).toUpperCase()}</b>
                </div>
              )}

              <button
                onClick={async () => {
                  try {
                    await api.post(`/pvp/${r.roomId}/join`);
                    router.push(`/game/battle/room/${r.roomId}`);
                  } catch {
                    // Lỗi đã được useApi hiển thị toast
                  }
                }}
                className="mt-3 px-3 py-2 rounded-xl border shadow w-full"
              >
                Join
              </button>
            </div>
          );
        })}

        {/* Trạng thái rỗng chỉ hiện khi không loading */}
        {!loadingRooms && !rooms.length && (
          <div className="opacity-70">No waiting rooms right now.</div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 dark:text-white rounded-2xl p-4 w-full max-w-md">
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

              {gameId === "coinflip" ? (
                <>
                  <div>
                    <div className="text-sm mb-1">Your side</div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="hostSide"
                          value="heads"
                          checked={hostSide === "heads"}
                          onChange={() => setHostSide("heads")}
                        />
                        Heads
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="hostSide"
                          value="tails"
                          checked={hostSide === "tails"}
                          onChange={() => setHostSide("tails")}
                        />
                        Tails
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                  {gameId === "dice" && (
                    <div>
                      <div className="text-sm mb-1">Dice Type</div>
                      <select
                        className="border rounded-xl px-3 py-2 w-full"
                        value={diceSides}
                        onChange={(e) => setDiceSides(parseInt(e.target.value, 10))}
                      >
                        {ALLOWED_SIDES.map((s) => (
                          <option key={s} value={s}>
                            d{s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-2 rounded-xl border"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-xl border shadow"
                disabled={creating}
                onClick={createRoom}
              >
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default RequireAuth(BattleGameRoomsPage)