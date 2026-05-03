// dev-server.mjs — bypasses Turbopack by starting Next in Webpack mode directly
import { startServer } from "next/dist/server/lib/start-server.js";

await startServer({
  dir: process.cwd(),
  port: 3001,
  turbopack: false,
  isDev: true,
});
