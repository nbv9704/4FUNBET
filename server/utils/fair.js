// server/utils/fair.js
const crypto = require('crypto');

/**
 * In-memory active server seed for commit–reveal.
 * Bạn có thể lưu/rotate seed này ở DB/redis theo chu kỳ nếu muốn.
 */
let ACTIVE_SERVER_SEED = null;

/** Tạo serverSeed ngẫu nhiên (64 hex) */
function makeServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/** Đặt/rotate serverSeed đang hoạt động (trả lại seed mới) */
function setActiveServerSeed(seed) {
  ACTIVE_SERVER_SEED = seed || makeServerSeed();
  return ACTIVE_SERVER_SEED;
}

/** Lấy serverSeed đang hoạt động (tự tạo nếu chưa có) */
function getActiveServerSeed() {
  if (!ACTIVE_SERVER_SEED) setActiveServerSeed();
  return ACTIVE_SERVER_SEED;
}

/** SHA-256 tiện dụng (dùng làm commit hash) */
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/** Commit: hash của serverSeed hiện tại */
function getSeedHash() {
  return sha256(getActiveServerSeed());
}

/**
 * HMAC hex = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
 * Đây là lõi “provably fair”: clientSeed + nonce khiến server không thể đơn phương điều khiển kết quả.
 */
function hmacHex({ serverSeed, clientSeed, nonce }) {
  const key = String(serverSeed);
  const msg = `${String(clientSeed)}:${String(nonce)}`;
  return crypto.createHmac('sha256', key).update(msg).digest('hex');
}

/** Lấy số thực [0,1) từ 8 hex đầu của HMAC */
function hmacFloat({ serverSeed, clientSeed, nonce }) {
  const hex = hmacHex({ serverSeed, clientSeed, nonce });
  const int32 = parseInt(hex.slice(0, 8), 16);
  return int32 / 0xffffffff; // 0..1 (không bao gồm 1)
}

/** Coinflip từ seed (heads/tails) */
function coinflip({ serverSeed, clientSeed, nonce }) {
  return hmacFloat({ serverSeed, clientSeed, nonce }) < 0.5 ? 'heads' : 'tails';
}

/** Verify một kết quả coinflip */
function verify({ serverSeed, clientSeed, nonce, result }) {
  return coinflip({ serverSeed, clientSeed, nonce }) === result;
}

module.exports = {
  // seed lifecycle
  makeServerSeed,
  setActiveServerSeed,
  getActiveServerSeed,
  getSeedHash,
  sha256,
  // rng
  hmacHex,
  hmacFloat,
  coinflip,
  verify,
};
