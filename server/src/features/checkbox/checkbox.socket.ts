import { Server, Socket } from "socket.io";
import { checkboxService } from "./checkbox.service";
import { rateLimiter } from "../../utils/rateLimiter";
import { validateRange } from "./checkbox.validator";

export const registerCheckboxHandlers = (io: Server, socket: Socket) => {
  const userId = socket.id;

  socket.on("toggle_checkbox", async (data) => {
    try {
      const allowed = await rateLimiter.isAllowed(userId);

      if (!allowed) {
        socket.emit("rate_limited", {
          message: "Too many requests",
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

  socket.on("get_range", async (data) => {
    try {
      const allowed = await rateLimiter.isAllowed(userId);

      if (!allowed) {
        socket.emit("rate_limited", {
          message: "Too many requests",
        });
        return;
      }

      const { start, end } = data;

      if (!validateRange(start, end)) {
        socket.emit("error", { message: "Invalid range" });
      }

      const rangeData = await checkboxService.getRange(start, end);

      socket.emit("range_data", {
        start,
        end,
        data: rangeData,
      });
    } catch (error) {
      socket.emit("error", {
        message: "Failed to fetch range",
      });
    }
  });
};
