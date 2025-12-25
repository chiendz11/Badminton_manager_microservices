// src/socket.js
import { io } from "socket.io-client";
const SOCKET_URL = import.meta.env.API_GATEWAY_URL || "http://localhost";
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
});
export default socket;
