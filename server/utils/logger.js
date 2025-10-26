// server/utils/logger.js
const os = require("os");

function log(level, msg, extra = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    host: os.hostname(),
    pid: process.pid,
    ...extra,
  };
  // JSON lines: dễ ship sang ELK/Datadog/Stackdriver
  console.log(JSON.stringify(record));
}

module.exports = {
  info: (msg, extra) => log("info", msg, extra),
  warn: (msg, extra) => log("warn", msg, extra),
  error: (msg, extra) => log("error", msg, extra),
};
