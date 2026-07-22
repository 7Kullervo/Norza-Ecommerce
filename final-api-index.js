// api/index.js — Vercel serverless entry point.
// Vercel does not run app.listen(); it calls this exported handler for
// every request instead. This reuses the exact same Express app defined
// in server.js.
const app = require("../server");

module.exports = app;
