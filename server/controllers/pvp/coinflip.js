// server/controllers/pvp/coinflip.js
const User = require('../../models/User');
const { makeServerSeed, sha256, coinflip } = require('../../utils/fair');
const { recordGameHistory } = require('../../utils/history');

const OPP = { heads: 'tails', tails: 'heads' };

function normalizeSide(s) {
  const v = String(s || '').toLowerCase();
  if (v !== 'heads' && v !== 'tails') throw new Error('Invalid coin side');
  return v;
}

// Khi tạo phòng: ép 2 người, lưu side chủ phòng + commit fair seed
exports.prepareCreate = ({ ownerId, body }) => {
  const side = normalizeSide(body.coinflipSide || body.side || 'heads');
  const serverSeed = makeServerSeed();
  const seedHash = sha256(serverSeed);

  return {
    maxPlayers: 2,
    metadata: {
      coinflip: {
        sides: { [String(ownerId)]: side }, // map userId -> side
        fair: { serverSeed, seedHash, nonce: 0 }, // serverSeed ẩn cho tới khi kết thúc
        result: null,
      },
    },
  };
};

// Khi người khác join: auto nhận mặt còn lại
exports.onJoin = ({ room, joinerId }) => {
  if (room.game !== 'coinflip') return;
  const cf = room.metadata?.coinflip || {};
  const hostId = String(room.createdBy);
  const hostSide = cf.sides?.[hostId];
  if (!hostSide) return;

  cf.sides = cf.sides || {};
  const joinerKey = String(joinerId);
  if (!cf.sides[joinerKey]) {
    cf.sides[joinerKey] = OPP[hostSide];
  }
  room.metadata = { ...(room.metadata || {}), coinflip: cf };
};

// Điều kiện riêng để start
exports.canStart = (room) => {
  if (room.players?.length !== 2) return false;
  const cf = room.metadata?.coinflip;
  if (!cf?.sides) return false;
  const [p1, p2] = room.players.map(p => String(p.userId));
  const s1 = cf.sides[p1], s2 = cf.sides[p2];
  return (s1 && s2 && s1 !== s2);
};

// Settle: flip → chuyển tiền → ghi lịch sử → đóng phòng
exports.settle = async (room) => {
  const cf = room.metadata.coinflip;
  const [p1, p2] = room.players.map(p => String(p.userId));
  const bet = Number(room.betAmount) || 0;

  // Kiểm tra số dư đủ đặt cọc
  const [u1, u2] = await Promise.all([User.findById(p1), User.findById(p2)]);
  if (!u1 || !u2) throw new Error('User not found');
  if (u1.balance < bet || u2.balance < bet) {
    throw new Error('One of players has insufficient balance');
  }

  // Flip bằng commit–reveal (clientSeed = roomId, nonce tăng dần)
  const serverSeed = cf.fair.serverSeed;
  const clientSeed = room.roomId;
  const nonce = Number(cf.fair.nonce) || 0;

  const result = coinflip({ serverSeed, clientSeed, nonce });
  cf.fair.nonce = nonce + 1;
  cf.result = result;

  // Xác định winner (side nào khớp result)
  const pick = (uid) => cf.sides[String(uid)];
  const winnerId = pick(p1) === result ? p1 : p2;
  const loserId  = winnerId === p1 ? p2 : p1;

  // Net transfer: winner +bet, loser -bet
  const [uw, ul] = winnerId === p1 ? [u1, u2] : [u2, u1];
  uw.balance += bet;
  ul.balance -= bet;
  await Promise.all([uw.save(), ul.save()]);

  // Cập nhật room & reveal seed
  cf.fair.serverSeedReveal = serverSeed;
  room.metadata.coinflip = cf;
  room.status = 'finished';
  room.winnerUserId = winnerId;
  await room.save();

  // Lịch sử
  await Promise.all([
    recordGameHistory({ userId: winnerId, game: 'coinflip_battle', betAmount: bet, outcome: 'win',  payout: bet }),
    recordGameHistory({ userId: loserId,  game: 'coinflip_battle', betAmount: bet, outcome: 'lose', payout: 0   }),
  ]);

  return { result, winnerId, bet, seedHash: cf.fair.seedHash, serverSeed };
};
