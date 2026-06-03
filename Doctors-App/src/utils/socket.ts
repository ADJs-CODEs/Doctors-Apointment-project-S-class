import { io, Socket } from "socket.io-client";

const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://doctors-apointment-project-s-class.onrender.com";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
