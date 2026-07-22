// api/index.js — Vercel serverless entry point.
// Vercel doesn't run app.listen(); instead it calls this exported handler
// for every request. We reuse the exact same Express app from server.js.
const app = require("../server");

module.exports = app;
