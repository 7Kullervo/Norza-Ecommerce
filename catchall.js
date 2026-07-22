// api/[...path].js — Vercel catch-all serverless function.
// Naming a file [...path].js makes Vercel automatically route EVERY request
// under /api/* to this one function, with zero vercel.json routing config
// needed. This is the most reliable way to deploy an Express app on Vercel.
const app = require("../server");

module.exports = app;
