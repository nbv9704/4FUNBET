// server/middleware/logRequest.js
const logger = require("../utils/logger");
const { randomUUID } = require("crypto");

/**
 * ENV hỗ trợ:
 *  - HTTP_LOG_LEVEL=info | off
 *      + info (mặc định): bật log http_request
 *      + off: tắt toàn bộ log HTTP
 *  - HTTP_LOG_IGNORE_PATHS=/api/admin/pvp/health,/api/metrics
 */
const HTTP_LOG_LEVEL = (process.env.HTTP_LOG_LEVEL || "info").toLowerCase();
const IGNORE_PATHS = (process.env.HTTP_LOG_IGNORE_PATHS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = function logRequest(req, res, next) {
  // Tắt toàn bộ nếu cấu hình off
  if (HTTP_LOG_LEVEL === "off") return next();

  // Gắn requestId (nhận từ FE hoặc tự sinh), và trả lại header để trace end-to-end
  const hdr = req.headers["x-request-id"];
  req.requestId = typeof hdr === "string" && hdr.trim() ? hdr.trim() : randomUUID();
  res.setHeader("x-request-id", req.requestId);

  const start = Date.now(); // thời điểm BE nhận request
  const clientNowHeader = req.headers["x-client-now"];
  const clientNow = clientNowHeader ? Number(clientNowHeader) : null;

  // Bỏ qua các path cấu hình ignore
  const path = req.path || req.originalUrl || req.url || "";
  if (IGNORE_PATHS.length && IGNORE_PATHS.includes(path)) {
    return next();
  }

  res.on("finish", () => {
    try {
      const latency = Date.now() - start;

      // Lệch đồng hồ tại thời điểm request tới server (ít bias hơn finish)
      const skew =
        clientNow && !Number.isNaN(clientNow) ? clientNow - start : undefined;

      // Lấy userId SAU khi các middleware (auth) đã chạy
      const userId = req.user?.id ? String(req.user.id) : undefined;

      // IP ưu tiên X-Forwarded-For, sau đó socket.remoteAddress
      const forwarded = req.headers["x-forwarded-for"];
      const ip =
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        "";

      // Ghi log theo schema http_request quen thuộc
      logger.info("http_request", {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        userId,
        latencyMs: latency,
        skewMs: skew,
        ip,
      });
    } catch (_) {
      // nuốt lỗi để không ảnh hưởng response
    }
  });

  next();
};
