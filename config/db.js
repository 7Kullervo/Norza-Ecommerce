const mongoose = require("mongoose");

// Serverless-friendly connection: reuses the connection across warm
// invocations instead of reconnecting every request, and NEVER calls
// process.exit() — that would kill the entire serverless function on
// every single request if the database is briefly unreachable, instead
// of just failing that one request gracefully.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  console.log("ENV CHECK:");
  console.log("MONGO_URI EXISTS:", !!process.env.MONGO_URI);
  console.log("MONGO_URI VALUE:", process.env.MONGO_URI);

cached.promise = mongoose.connect(process.env.MONGO_URI);

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error(`MongoDB connection error: ${err.message}`);
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
