import { createServer } from "http";
import { app } from "./app";
import { initSocket } from "./config/socket";
import { registerSockets } from "./sockets";
import { redis } from "./config/redis";

async function main() {
  const server = createServer(app);

  const io = await initSocket(server);
  registerSockets(io);

  const PORT: number = +(process.env.PORT ?? 3000);

  await redis.connect();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main();
