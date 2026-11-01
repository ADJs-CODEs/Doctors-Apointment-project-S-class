import { io, type Socket } from "socket.io-client";
import { BASE_URL } from "./apiPath";

let socket: Socket | null = null;

/** One shared connection to the backend's socket.io server. */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};
