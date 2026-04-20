import { Server, Socket } from "socket.io";
import { checkboxService } from "./checkbox.service";
import { rateLimiter } from "../../utils/rateLimiter";

export const registerCheckboxHandles = (io: Server, socket: Socket) => {
  const userId = socket.id;

  socket.on("toggle_checkbox", async (data) => {
    try {
      const allowed = await rateLimiter.isAllowed(userId);

      if (!allowed) {
        socket.emit("rate_limited", {
          message: "Too many actions. Slow down.",
        });
        return;
      }

      const result = await checkboxService.toggle(data, userId);

      if (!result) return;

      io.emit("checkbox_updated", result);
    } catch (error) {
      console.error("Toggle error: ", error);
    }
  });
};
