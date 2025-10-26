// client/src/app/game/battle/room/[roomId]/page.js
"use client";

import RequireAuth from '@/components/RequireAuth'
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useApi from "@/hooks/useApi";
import useSocket from "@/hooks/useSocket";
import { useUser } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import ServerCountdown from "@/components/ServerCountdown";

import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";
import VerifyFairnessModal from "@/components/VerifyFairnessModal";

// ====== Logic phòng battle ======
let REVEAL_MS = 3000;

function getFlipResult(md) {
  if (!md) return null;
  if (md.flipResult) return md.flipResult;
  if (md.coinflip?.result) return md.coinflip.result;
  return null;
}
function deriveFaceFromWinner(room) {
  if (!room?.winnerUserId || !Array.isArray(room?.players)) return null;
  const winId = String(room.winnerUserId);
  const winner = room.players.find((p) => String(p.userId) === winId);
  const side = winner?.side;
  return side ? side : null;
}

function mergeKnownUsers(nextRoom, prevRoom) {
  if (!nextRoom) return nextRoom;
  if (!prevRoom) return nextRoom;
  const map = new Map(
    (prevRoom.players || []).map((p) => [String(p.userId), p.user || null])
  );
  const mergedPlayers = (nextRoom.players || []).map((p) => {
    if (p && (!p.user || Object.keys(p.user || {}).length === 0)) {
      const known = map.get(String(p.userId));
      if (known) return { ...p, user: known };
    }
    return p;
  });
  return { ...nextRoom, players: mergedPlayers };
}

function BattleRoomLobbyPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const api = useApi();
  const { fetchUser } = useUser();

  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [readying, setReadying] = useState(false);
  const [starting, setStarting] = useState(false);

  // Dice UI
  const [rolling, setRolling] = useState(false);
  const [pendingValue, setPendingValue] = useState(null);
  const [suppressMyRoll, setSuppressMyRoll] = useState(false);

  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Coinflip reveal
  const [isRevealing, setIsRevealing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalFace, setFinalFace] = useState(null);

  // Verify modal
  const [verifyOpen, setVerifyOpen] = useState(false);

  // Dialog states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const revealStartedRef = useRef(false);
  const coinPendingRef = useRef(false);
  const prevStatusRef = useRef(null);
  const finishedToastShownRef = useRef(false);

  // 🔔 NEW: dedup "Room not found" toast
  const notFoundToastShownRef = useRef(false);
  const NOT_FOUND_TOAST_ID = "roomNotFound";

  const socket = useSocket(me?.id);

  const isOwner = useMemo(() => {
    if (!room || !me) return false;
    return String(room.createdBy) === String(me.id);
  }, [room, me]);

  const getDisplayName = (p) =>
    p?.user?.username || p?.user?.name || (typeof p?.userId === "string" ? p.userId.slice(-6) : "Player");
  const getAvatar = (p) => p?.user?.avatar || null;

  const md = room?.metadata || {};
  const dice = md?.dice || {};
  const myId = me?.id ? String(me.id) : null;
  const myPlayer = room?.players?.find((p) => String(p.userId) === String(myId));

  // ------- lấy constants -------
  useEffect(() => {
    (async () => {
      try {
        const c = await api.get("/pvp/constants");
        if (c?.REVEAL_MS) REVEAL_MS = Number(c.REVEAL_MS);
      } catch {}
    })();
  }, []);

  /** ---------- TURN CALC ---------- */
  const fallbackOrder = (room?.players || []).map((p) => String(p.userId));
  const computedOrder =
    Array.isArray(md?.turnOrder) && md.turnOrder.length ? md.turnOrder.map(String) : fallbackOrder;

  const rawIdx = typeof md?.currentTurnIndex === "number" ? md.currentTurnIndex : 0;
  const curIdx =
    computedOrder.length === 0 ? -1 : Math.max(0, Math.min(rawIdx, computedOrder.length - 1));
  const curUserId = curIdx >= 0 ? String(computedOrder[curIdx]) : null;

  const isMyTurn =
    room?.game === "dice" &&
    room?.status === "active" &&
    myId &&
    curUserId &&
    String(myId) === String(curUserId);

  const myRolled = !!dice?.rolls?.some((r) => String(r.userId) === String(myId));
  /** ------------------------------------------------ */

  async function fetchMe() {
    try {
      const data = await api.get("/auth/me");
      setMe(data);
    } catch {
      setMe(null);
    }
  }

  async function fetchRoom() {
    // 🔇 NEW: chặn auto-toast từ useApi cho call này để tự điều phối 404
    const origToastError = toast.error;
    toast.error = () => {};
    try {
      const data = await api.get(`/pvp/${roomId}`);
      setRoom((prev) => mergeKnownUsers(data, prev));
      return data;
    } catch (e) {
      // Nhận diện 404 để chỉ hiển thị đúng 1 lần và điều hướng về list
      const status = e?.status || e?.data?.status;
      const code = e?.code || e?.data?.code;
      const msg = (e?.message || "").toLowerCase();
      const isNotFound = status === 404 || code === "NOT_FOUND" || /not\s*found/.test(msg);

      if (isNotFound && !notFoundToastShownRef.current) {
        notFoundToastShownRef.current = true;
        toast.error("Room not found", { id: NOT_FOUND_TOAST_ID });
        const back = `/game/battle/${room?.game || ""}`;
        // Dùng setTimeout để tránh xung đột với render hiện tại
        setTimeout(() => {
          const url = back || "/game/room";
          router.push(url);
        }, 0);
      }

      setRoom(null);
      return null;
    } finally {
      toast.error = origToastError;
    }
  }

  function maybeStartCoinPendingAnimation(roomData) {
    const pend = roomData?.metadata?.pendingCoin;
    if (roomData?.game === "coinflip" && pend && !revealStartedRef.current) {
      revealStartedRef.current = true;
      coinPendingRef.current = true;
      setFinalFace(null);
      setShowResult(false);
      setIsRevealing(true);
    }
  }

  useEffect(() => {
    revealStartedRef.current = false;
    coinPendingRef.current = false;
    setIsRevealing(false);
    setShowResult(false);
    setFinalFace(null);

    setRolling(false);
    setPendingValue(null);
    setSuppressMyRoll(false);

    finishedToastShownRef.current = false;
    notFoundToastShownRef.current = false; // reset dedup khi vào room mới

    fetchMe();
    fetchRoom().then((d) => {
      if (d) maybeStartCoinPendingAnimation(d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /** ---------- SOCKET ---------- */
  useEffect(() => {
    if (!socket) return;
    socket.emit("pvp:joinRoomChannel", roomId);

    const applyPayloadRoom = (payload) => {
      const roomFromPayload = payload?.room;
      if (roomFromPayload && roomFromPayload.roomId === roomId) {
        setRoom((prev) => mergeKnownUsers(roomFromPayload, prev));
        maybeStartCoinPendingAnimation(roomFromPayload);

        const missingUser = (roomFromPayload.players || []).some((p) => !p?.user);
        if (missingUser) fetchRoom(); // fire & forget
        return true;
      }
      return false;
    };

    const onEvent = async (eventName, payload) => {
      // 🔒 Nếu phòng đã bị xoá, hiển thị đúng 1 toast và điều hướng, không fetchRoom nữa
      if (eventName === "pvp:roomDeleted" && payload?.roomId === roomId) {
        if (!notFoundToastShownRef.current) {
          notFoundToastShownRef.current = true;
          toast.error("Room not found", { id: NOT_FOUND_TOAST_ID });
        }
        router.push(`/game/battle/${room?.game || ""}`);
        return;
      }

      const got = applyPayloadRoom(payload);
      if (!got) {
        const d = await fetchRoom();
        if (d) maybeStartCoinPendingAnimation(d);
      }

      if (eventName === "pvp:roomStarted") {
        fetchUser();
        finishedToastShownRef.current = false;
      }

      if (eventName === "pvp:roomFinished") {
        fetchUser();
        const fresh = got ? payload.room : await fetchRoom();
        if (!fresh) return;
        if (fresh.game === "coinflip") {
          if (coinPendingRef.current) {
            const face = getFlipResult(fresh?.metadata) || deriveFaceFromWinner(fresh);
            setFinalFace(face ? String(face).toUpperCase() : null);
            setIsRevealing(false);
            setShowResult(true);
          } else {
            triggerReveal();
          }
        }
        if (!finishedToastShownRef.current) {
          finishedToastShownRef.current = true;
          toast.success("Game finished!");
        }
      }
    };

    const onUpdated  = (p) => onEvent("pvp:roomUpdated", p);
    const onStarted  = (p) => onEvent("pvp:roomStarted", p);
    const onFinished = (p) => onEvent("pvp:roomFinished", p);
    const onDeleted  = (p) => onEvent("pvp:roomDeleted", p);

    socket.on("pvp:roomUpdated", onUpdated);
    socket.on("pvp:roomStarted", onStarted);
    socket.on("pvp:roomFinished", onFinished);
    socket.on("pvp:roomDeleted", onDeleted);

    return () => {
      socket.emit("pvp:leaveRoomChannel", roomId);
      socket.off("pvp:roomUpdated", onUpdated);
      socket.off("pvp:roomStarted", onStarted);
      socket.off("pvp:roomFinished", onFinished);
      socket.off("pvp:roomDeleted", onDeleted);
    };
  }, [socket, roomId, fetchUser, router, room?.game]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = room?.status;
    if (prev !== cur && prev === "active" && cur === "finished" && room?.game === "coinflip") {
      if (!coinPendingRef.current) triggerReveal();
    }
    prevStatusRef.current = cur || null;
  }, [room?.status, room?.game]);

  useEffect(() => {
    if (room?.game !== "coinflip") return;
    if (room?.status === "finished" && !isRevealing && !revealStartedRef.current) {
      const face = getFlipResult(md) || deriveFaceFromWinner(room);
      setFinalFace(face ? String(face).toUpperCase() : null);
      setShowResult(true);
    }
  }, [room?.status, isRevealing, room?.game]);

  async function triggerReveal() {
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;

    const fresh = await fetchRoom();
    const faceRaw = getFlipResult(fresh?.metadata) || deriveFaceFromWinner(fresh);
    const face = faceRaw ? String(faceRaw).toUpperCase() : null;

    setFinalFace(face);
    setShowResult(false);
    setIsRevealing(true);

    setTimeout(() => {
      setIsRevealing(false);
      setShowResult(true);
      if (!finishedToastShownRef.current) {
        finishedToastShownRef.current = true;
        toast.success("Game finished!");
      }
    }, REVEAL_MS);
  }

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
      const requestId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      await api.post(`/pvp/${roomId}/start`, { requestId });
      const d = await fetchRoom();
      await fetchUser();
      finishedToastShownRef.current = false;
      if (d) maybeStartCoinPendingAnimation(d);
    } catch {
      // handled by useApi
    } finally {
      setStarting(false);
    }
  }

  // Dice: commit ngay, tự ẩn số mình 3s
  async function doRoll() {
    setRolling(true);
    setSuppressMyRoll(true);
    setPendingValue(null);

    try {
      const requestId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const data = await api.post(`/pvp/${roomId}/roll`, { requestId });
      const rolls = data?.metadata?.dice?.rolls || [];
      const rec = rolls.find((r) => String(r.userId) === String(myId));
      setPendingValue(rec?.value ?? null);
    } catch {
      setSuppressMyRoll(false);
      setRolling(false);
      return;
    }

    setTimeout(async () => {
      setRolling(false);
      setSuppressMyRoll(false);
      await fetchRoom();
      setTimeout(() => setPendingValue(null), 300);
    }, REVEAL_MS);
  }

  function doInvite() {
    setInviteOpen(true);
  }

  // ✅ Bắt lỗi 404/USER_NOT_FOUND, KHÔNG cho useApi bắn toast "Not found"
  async function handleInviteSubmit(targetUserId) {
    if (!targetUserId) return;

    // Tạm thời mute toast.error mặc định để tránh trùng thông báo
    const origToastError = toast.error;
    const restoreToast = () => {
      if (toast.error !== origToastError) toast.error = origToastError;
    };
    toast.error = () => {};

    try {
      setInviting(true);
      const uid = String(targetUserId).trim();

      const resp = await api.post(`/pvp/${roomId}/invite`, { targetUserId: uid });

      // Khôi phục trước khi show toast của mình
      restoreToast();

      const uname =
        resp?.invitedUser?.username ||
        String(resp?.invitedUser?.id || uid).slice(-6);

      toast.success(`Đã gửi lời mời cho ${uname}`);
      setInviteOpen(false);
    } catch (e) {
      // Khôi phục trước khi show toast của mình
      restoreToast();

      const code = e?.code || e?.data?.code;
      const status = e?.status || e?.data?.status;
      const msg = e?.message || "";
      if (status === 404 || code === "USER_NOT_FOUND" || /User not found/i.test(msg)) {
        toast.error("Không thể mời do người chơi không tồn tại");
        return;
      }
      toast.error(msg || "Không thể mời");
    } finally {
      restoreToast();
      setInviting(false);
    }
  }

  async function doLeave() {
    try {
      setLeaving(true);
      await api.post(`/pvp/${roomId}/leave`);
      router.push(`/game/battle/${room?.game || ""}`);
    } catch {
    } finally {
      setLeaving(false);
    }
  }

  function doDelete() {
    setConfirmDeleteOpen(true);
  }
  async function handleConfirmDelete() {
    try {
      setDeleting(true);
      await api.del(`/pvp/${roomId}`);
      router.push(`/game/battle/${room?.game || ""}`);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  function getRollFor(userId) {
    const rec = dice?.rolls?.find((r) => String(r.userId) === String(userId));
    const v = rec?.value;
    return typeof v === "number" ? v : "-";
  }

  const winners =
    room?.game === "coinflip"
      ? room?.winnerUserId
        ? [String(room.winnerUserId)]
        : []
      : (dice?.result?.winners || []);

  const pot =
    room?.game === "coinflip"
      ? Number(room?.betAmount || 0) * 2
      : Number(room?.betAmount || 0) * (room?.players?.length || 0);

  const coinPending =
    room?.game === "coinflip" && room?.status === "active" && !!md?.pendingCoin;

  const dicePending = room?.game === "dice" && room?.status === "active" && !!md?.pending;

  const getPlayerById = (uid) => (room?.players || []).find((p) => String(p.userId) === String(uid));
  const nameById = (uid) => getDisplayName(getPlayerById(uid));
  const avatarById = (uid) => getAvatar(getPlayerById(uid));

  const rollDisabled =
    (!isMyTurn ? "Not your turn" :
      (myRolled ? "You already rolled" :
        (rolling ? "Rolling..." :
          (dicePending ? "Please wait for reveal" : ""))));
  const rollDisabledBool = !isMyTurn || myRolled || rolling || dicePending;

  const isValidObjectId = (s) => /^[a-fA-F0-9]{24}$/.test(String(s || "").trim());
  const validateObjectId = (s) => (isValidObjectId(s) ? null : "ID không hợp lệ (cần 24 ký tự hex).");

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
              {room.game === "dice" && dice?.sides && (
                <div className="text-sm mt-1">Dice: d{dice.sides}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm opacity-70">Status</div>
              <div className="font-semibold">{room.status}</div>
              {md?.serverSeedHash && room.status !== "finished" && (
                <div className="text-xs opacity-70 mt-1 truncate">Seed Hash: {md.serverSeedHash}</div>
              )}
              <div className="mt-2">
                <button
                  onClick={() => setVerifyOpen(true)}
                  className="text-xs px-2 py-1 rounded border shadow"
                  title="Verify fairness"
                >
                  Verify fairness
                </button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {Array.from({ length: room.maxPlayers || 2 }).map((_, idx) => {
              const p = room.players?.[idx];
              const avatar = p ? getAvatar(p) : null;
              const isCurrent = p && String(p.userId) === String(curUserId);
              return (
                <div key={idx} className="border rounded-xl p-3 relative">
                  {avatar && (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-8 h-8 rounded-full absolute top-2 right-2 object-cover ring-2 ring-black/20"
                    />
                  )}
                  <div className="text-sm opacity-70">Slot {idx + 1}</div>
                  {p ? (
                    <>
                      <div className="mt-1 font-semibold break-all pr-10">
                        {getDisplayName(p)}
                      </div>
                      <div className="text-sm">Ready: {p.ready ? "Yes" : "No"}</div>

                      {room.game === "coinflip" && p.side && (
                        <div className="text-sm">
                          Side: <b>{p.side.toUpperCase()}</b>
                        </div>
                      )}

                      {room.game === "dice" && (
                        <div className="text-sm">
                          Roll:{" "}
                          <b>
                            {String(p.userId) === String(myId) && suppressMyRoll
                              ? "-"
                              : getRollFor(p.userId)}
                          </b>
                          {room.status === "active" && isCurrent && "  ← current"}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-1 opacity-60">Empty</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Waiting controls */}
          {room.status === "waiting" && (
            <>
              <div className="mt-4 text-sm flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div>
                    Game:{" "}
                    <b>
                      {room.game === "dice"
                        ? `Dice (d${dice?.sides || 6})`
                        : "Coinflip"}
                    </b>
                  </div>
                  {room.game === "coinflip" && myPlayer?.side && (
                    <div className="mt-1">
                      Your side: <b>{myPlayer.side.toUpperCase()}</b>
                    </div>
                  )}
                </div>
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
                      disabled={
                        !(
                          room.players?.length >= 2 &&
                          room.players.some(
                            (p) =>
                              String(p.userId) !== String(room.createdBy) &&
                              p.ready
                          )
                        ) || starting
                      }
                      title="All participants must be Ready (min 2 players)"
                    >
                      {starting ? "Starting..." : "Start"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Coinflip PENDING */}
          {coinPending && (
            <div className="mt-6 rounded-2xl border p-4 flex items-center gap-6">
              <div
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-xl font-bold ${
                  isRevealing ? "animate-flip" : ""
                }`}
              />
              <div className="text-sm">
                <div className="font-semibold">Flipping...</div>
                <div className="opacity-70">
                  Reveal in{" "}
                  <ServerCountdown
                    serverNow={room.serverNow}
                    target={md?.pendingCoin?.revealAt}
                    className="font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active controls (DICE) */}
          {room.game === "dice" && room.status === "active" && (
            <div className="mt-4 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 bg-gray-800 text-white rounded-lg border-4 flex items-center justify-center text-2xl font-bold ${
                      rolling ? "animate-dice-roll-3d" : ""
                    }`}
                    style={{ perspective: "800px" }}
                  >
                    {rolling
                      ? ""
                      : (pendingValue ?? (getRollFor(myId) === "-" ? "?" : getRollFor(myId)))
                    }
                  </div>

                  <div className="text-sm">
                    Turn:{" "}
                    <b>
                      {curUserId
                        ? room.players?.find((p) => String(p.userId) === String(curUserId))?.user?.username ||
                          String(curUserId).slice(-6)
                        : "-"}
                    </b>
                    {dicePending && (
                      <div className="mt-1 text-xs opacity-80 space-x-3">
                        <span>
                          Reveal in{" "}
                          <ServerCountdown
                            serverNow={room.serverNow}
                            target={md?.pending?.revealAt}
                            className="font-semibold"
                          />
                        </span>
                        <span>
                          Next turn in{" "}
                          <ServerCountdown
                            serverNow={room.serverNow}
                            target={md?.pending?.advanceAt}
                            className="font-semibold"
                          />
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="px-4 py-2 rounded-xl border shadow disabled:opacity-50"
                  onClick={doRoll}
                  disabled={rollDisabledBool}
                  title={rollDisabled || "Roll your dice!"}
                >
                  {rolling ? "Rolling..." : "Roll"}
                </button>
              </div>
            </div>
          )}

          {/* Finished + result */}
          {room.status === "finished" && (
            <div className="mt-6 rounded-2xl border p-4 space-y-4">
              <div className="text-lg font-semibold">Result</div>

              <div className="flex items-center gap-6">
                <div
                  className={
                    room.game === "dice"
                      ? `w-24 h-24 bg-gray-800 text-white rounded-lg border-4 flex items-center justify-center text-2xl font-bold`
                      : `w-24 h-24 rounded-full border-4 flex items-center justify-center text-xl font-bold ${
                          isRevealing ? "animate-flip" : ""
                        }`
                  }
                  style={room.game === "dice" ? { perspective: "800px" } : undefined}
                >
                  {room.game === "dice"
                    ? (dice?.result?.max ?? "?")
                    : !isRevealing && (getFlipResult(md)?.toUpperCase() || finalFace || "?")}
                </div>

                <div className="text-sm space-y-2">
                  {(Array.isArray(winners) && winners.length > 0) && (
                    <div className="text-base flex items-center flex-wrap gap-3">
                      <span>Winner{winners.length > 1 ? "s" : ""}:</span>
                      {winners.map((wid, i) => {
                        const name = nameById(wid);
                        const ava = avatarById(wid);
                        return (
                          <span key={wid} className="inline-flex items-center gap-2">
                            {ava && (
                              <img
                                src={ava}
                                alt={name}
                                className="w-6 h-6 rounded-full object-cover ring-2 ring-black/20"
                              />
                            )}
                            <b>{name}</b>
                            {i < winners.length - 1 ? "," : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div>Pot: {pot}</div>
                </div>
              </div>

              {room.game === "dice" && Array.isArray(dice?.rolls) && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold mb-1">Rolls</div>
                  <ul className="space-y-1">
                    {dice.rolls.map((r, i) => {
                      const name = nameById(r.userId);
                      const show = (typeof r.value === "number") ? r.value : "-";
                      const isWin = (dice?.result?.winners || []).includes(String(r.userId));
                      return (
                        <li key={i}>
                          <b>{name}</b>: {show}{isWin ? " ✅" : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Modals */}
          <VerifyFairnessModal
            roomId={roomId}
            open={verifyOpen}
            onClose={() => setVerifyOpen(false)}
            onOpenChange={setVerifyOpen}
          />
          <PromptDialog
            open={inviteOpen}
            title="Invite a player"
            description="Enter target user's _id to send an invite."
            placeholder="5f8d04c8e3b5a6a1c2d3e4f5"
            confirmText="Send invite"
            cancelText="Cancel"
            required
            validate={validateObjectId}
            loading={inviting}
            onCancel={() => setInviteOpen(false)}
            onOpenChange={setInviteOpen}
            onConfirm={handleInviteSubmit}
          />
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Delete this room?"
            description="This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            loading={deleting}
            onCancel={() => setConfirmDeleteOpen(false)}
            onOpenChange={setConfirmDeleteOpen}
            onConfirm={handleConfirmDelete}
          />
        </div>
      ) : (
        // Skeleton
        <div className="rounded-2xl border shadow p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-20 rounded" />
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-5 w-36 rounded" />
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-24 rounded" />
            </div>
            <div className="space-y-2 w-40">
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-20 rounded ml-auto" />
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-3 w-full rounded ml-auto" />
              <div className="animate-pulse bg-black/10 dark:bg-white/10 h-7 w-24 rounded ml-auto" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-3 space-y-2">
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-16 rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-5 w-28 rounded" />
                <div className="animate-pulse bg-black/10 dark:bg-white/10 h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default RequireAuth(BattleRoomLobbyPage)