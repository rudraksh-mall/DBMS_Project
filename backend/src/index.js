// Load env vars FIRST so modules that read process.env at import time
// (e.g. db/cloudinary.js) get the values before they are evaluated.
import "dotenv/config";

// MySQL connection pool (replaces the previous MongoDB/Mongoose connection)
import { verifyConnection, closePool } from "./db/mysql.js";

// this file will handle core routing logic and route controllers
import { app } from "./app.js";

const PORT = process.env.PORT || 8000;

async function start() {
  try {
    await verifyConnection();
    console.log("MySQL connection pool ready");
  } catch (error) {
    console.error("MySQL connection FAILED:", error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  app.on("error", (error) => {
    console.log("ERRR: ", error);
    throw error;
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      try {
        await closePool();
      } finally {
        process.exit(0);
      }
    });
    // Force-exit if graceful close hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();