import { useEffect } from "react";
import { socket } from "../services/socket";

export const useSocket = (
  handlers: Record<string, (...args: unknown[]) => void>,
) => {
  useEffect(() => {
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [handlers]);
};
