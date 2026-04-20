import { createServer } from "http";
import { app } from "./app";
import { initSocket } from "./config/socket";
import { registerSockets } from "./sockets";

async function main() {
  const server = createServer(app);

  const io = initSocket(server);
  registerSockets(io);

  const PORT: number = +(process.env.PORT ?? 3000);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main();
