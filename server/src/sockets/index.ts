import { Server, Socket } from "socket.io";
import { registerCheckboxHandles } from "../features/checkbox/checkbox.socket";

export const registerSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected: ", socket.id);

    registerCheckboxHandles(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected: ", socket.id);
    });
  });
};
