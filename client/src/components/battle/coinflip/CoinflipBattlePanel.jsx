// client/src/components/battle/coinflip/CoinflipBattlePanel.jsx
'use client';
import React from 'react';
import ServerCountdown from '../../ServerCountdown';

export default function CoinflipBattlePanel({ room, me }) {
  const md = room?.metadata || {};
  // Schema mới từ BE:
  // - md.serverSeedHash
  // - md.serverSeedReveal (khi finished)
  // - md.pendingCoin = { revealAt, winnerUserId, result }
  // - md.flipResult (sau khi finish)
  const seedHash   = md.serverSeedHash || null;
  const seedReveal = md.serverSeedReveal || null;

  const pending  = md.pendingCoin || null;
  const revealAt = pending?.revealAt || null;

  // Winner ưu tiên room.winnerUserId; nếu chưa có thì dùng cái nằm trong pending
  const winnerId =
    (room?.winnerUserId ? String(room.winnerUserId) : (pending?.winnerUserId || null)) || null;

  // Result ưu tiên từ md.flipResult; nếu BE chưa set, cố gắng suy ra dựa vào side của winner
  const resultFromMeta = room?.status === 'finished' ? (md.flipResult || null) : null;

  const myId = me?.id ? String(me.id) : null;
  const isMe = (uid) => uid && myId && String(uid) === myId;

  const nameOf = (uid) => {
    const p = room?.players?.find((x) => String(x.userId) === String(uid));
    return p?.user?.username || String(uid || '').slice(-6);
  };

  // Suy ra mặt thắng từ winner nếu thiếu flipResult (dựa trên side người thắng)
  const deriveFaceFromWinner = () => {
    if (!winnerId) return null;
    const p = room?.players?.find((x) => String(x.userId) === String(winnerId));
    return p?.side || null;
  };

  const resultUpper =
    (resultFromMeta || deriveFaceFromWinner() || '-').toString().toUpperCase();

  const mySide = (() => {
    // coinflip hiện tại: side lưu ngay trên player
    const p = room?.players?.find((x) => String(x.userId) === myId);
    return p?.side || null;
  })();

  // Payout (pot) cho coinflip = betAmount * số người chơi (thực tế là 2)
  const pot = Number(room?.betAmount || 0) * (room?.players?.length || 0);

  return (
    <div className="mt-4 p-4 rounded-xl border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">
          Game: <b>Coinflip</b>
        </div>
        {seedHash ? (
          <div className="text-xs opacity-70 truncate">Seed Hash: {seedHash}</div>
        ) : null}
      </div>

      <div className="text-sm mb-2">
        {mySide ? (
          <>
            Your side: <b className="uppercase">{mySide}</b>
          </>
        ) : (
          'Sides will be assigned on join'
        )}
      </div>

      {room?.status === 'waiting' && (
        <div className="text-sm opacity-80">
          Waiting for everyone to Ready. Owner can Start when ready.
        </div>
      )}

      {room?.status === 'active' && pending && (
        <div className="text-sm opacity-80 flex items-center gap-2">
          Flipping... reveal in{' '}
          <ServerCountdown
            serverNow={room.serverNow}
            target={revealAt}
            className="font-semibold"
          />
        </div>
      )}

      {room?.status === 'finished' && (
        <div className="mt-2 space-y-2">
          <div className="text-lg">
            Result: <b className="uppercase">{resultUpper}</b>
          </div>
          {winnerId && (
            <div className="text-sm">
              Winner: <b>{isMe(winnerId) ? 'You' : nameOf(winnerId)}</b>
            </div>
          )}
          <div className="text-sm">Payout: {pot}</div>

          {seedReveal && (
            <div className="text-xs opacity-70 break-all">Seed Reveal: {seedReveal}</div>
          )}
        </div>
      )}
    </div>
  );
}
