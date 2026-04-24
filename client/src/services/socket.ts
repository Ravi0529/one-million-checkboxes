import { io } from "socket.io-client";
import { userId } from "./userId";

const servers = [
  "http://localhost:8000",
  "http://localhost:8001",
  "http://localhost:8002",
];

export const socket = io(servers[Math.floor(Math.random() * servers.length)], {
  auth: {
    userId,
  },
});
