// client/src/app/game/battle/room/[roomId]/page.js
"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useApi from "@/hooks/useApi";
import useSocket from "@/hooks/useSocket";

export default function BattleRoomLobbyPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const api = useApi();

  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [readying, setReadying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const socket = useSocket(me?.id);

  const isOwner = useMemo(() => {
    if (!room || !me) return false;
    return String(room.createdBy) === String(me.id);
  }, [room, me]);

  async function fetchMe() {
    try {
      const data = await api.get("/auth/me");
      setMe(data);
    } catch {
      setMe(null);
    }
  }

  async function fetchRoom() {
    try {
      const data = await api.get(`/pvp/${roomId}`);
      setRoom(data);
    } catch {
      setRoom(null);
    }
  }

  useEffect(() => {
    fetchMe();
    fetchRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("pvp:joinRoomChannel", roomId);

    const onUpdated = (payload) => {
      if (payload?.roomId && payload.roomId !== roomId) return;
      fetchRoom();
    };

    socket.on("pvp:roomUpdated", onUpdated);
    socket.on("pvp:roomStarted", onUpdated);
    socket.on("pvp:roomFinished", onUpdated);
    socket.on("pvp:roomDeleted", onUpdated);

    return () => {
      socket.emit("pvp:leaveRoomChannel", roomId);
      socket.off("pvp:roomUpdated", onUpdated);
      socket.off("pvp:roomStarted", onUpdated);
      socket.off("pvp:roomFinished", onUpdated);
      socket.off("pvp:roomDeleted", onUpdated);
    };
  }, [socket, roomId]);

  async function doReady() {
    try {
      setReadying(true);
      await api.post(`/pvp/${roomId}/ready`, { ready: true });
      await fetchRoom();
    } finally {
      setReadying(false);
    }
  }

  async function doStart() {
    try {
      setStarting(true);
      await api.post(`/pvp/${roomId}/start`);
      await fetchRoom();
    } finally {
      setStarting(false);
    }
  }

  async function doInvite() {
    const targetUserId = window.prompt("Enter target user's _id to invite:");
    if (!targetUserId) return;
    try {
      setInviting(true);
      await api.post(`/pvp/${roomId}/invite`, { targetUserId });
      alert("Invitation sent (if user is online).");
    } finally {
      setInviting(false);
    }
  }

  async function doLeave() {
    try {
      setLeaving(true);
      await api.post(`/pvp/${roomId}/leave`);
      router.push(`/game/battle/${room?.game || ""}`);
    } finally {
      setLeaving(false);
    }
  }

  async function doDelete() {
    if (!confirm("Delete this room?")) return;
    try {
      setDeleting(true);
      await api.del(`/pvp/${roomId}`);
      router.push(`/game/battle/${room?.game || ""}`);
    } finally {
      setDeleting(false);
    }
  }

  // Only non-owners must be ready
  const canStart = useMemo(() => {
    if (!room || !isOwner) return false;
    if (!["waiting", "active"].includes(room.status)) return false;
    if ((room.players?.length || 0) < 2) return false;
    const nonOwners = room.players.filter(p => String(p.userId) !== String(room.createdBy));
    return nonOwners.length > 0 && nonOwners.every(p => p.ready);
  }, [room, isOwner]);

  const getDisplayName = (p) => p?.user?.username || (typeof p?.userId === 'string' ? p.userId.slice(-6) : 'Player');
  const getAvatar = (p) => p?.user?.avatar || null;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link href={`/game/battle/${room?.game || ""}`} className="text-sm underline">
            Back
          </Link>
          <h1 className="text-2xl font-semibold">Battle Lobby</h1>
        </div>
        <div className="text-sm opacity-70">
          Room: <span className="font-mono">{roomId}</span>
        </div>
      </div>

      {room ? (
        <div className="rounded-2xl border shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-70">Game</div>
              <div className="font-semibold">{room.game}</div>
              <div className="text-sm mt-1">Bet: {room.betAmount}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-70">Status</div>
              <div className="font-semibold">{room.status}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {Array.from({ length: room.maxPlayers || 2 }).map((_, idx) => {
              const p = room.players?.[idx];
              const avatar = p ? getAvatar(p) : null;
              return (
                <div key={idx} className="border rounded-xl p-3 relative">
                  {avatar && (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-8 h-8 rounded-full absolute top-2 right-2 object-cover"
                    />
                  )}
                  <div className="text-sm opacity-70">Slot {idx + 1}</div>
                  {p ? (
                    <>
                      <div className="mt-1 font-semibold break-all pr-10">{getDisplayName(p)}</div>
                      {/* Removed Joined time as requested */}
                      <div className="text-sm">Ready: {p.ready ? "Yes" : "No"}</div>
                    </>
                  ) : (
                    <div className="mt-1 opacity-60">Empty</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button className="px-3 py-2 rounded-xl border shadow" onClick={doInvite} disabled={inviting}>
              {inviting ? "Inviting..." : "Invite"}
            </button>

            {!isOwner && (
              <>
                <button className="px-3 py-2 rounded-xl border shadow" onClick={doLeave} disabled={leaving}>
                  {leaving ? "Leaving..." : "Leave Room"}
                </button>
                <button className="px-3 py-2 rounded-xl border shadow" onClick={doReady} disabled={readying}>
                  {readying ? "Ready..." : "Ready"}
                </button>
              </>
            )}

            {isOwner && (
              <>
                <button className="px-3 py-2 rounded-xl border shadow" onClick={doDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Room"}
                </button>
                <button
                  className="px-3 py-2 rounded-xl border shadow disabled:opacity-50"
                  onClick={doStart}
                  disabled={!canStart || starting}
                  title={!canStart ? "All participants must be Ready (min 2 players)" : ""}
                >
                  {starting ? "Starting..." : "Start"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="opacity-70">Loading room...</div>
      )}
    </div>
  );
}
