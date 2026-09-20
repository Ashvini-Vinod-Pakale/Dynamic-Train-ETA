import { Client } from "@stomp/stompjs";

let stompClient = null;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8080" : "https://dynamic-train-eta.onrender.com");

const WEBSOCKET_URL =
  API_BASE_URL.replace(/^http/, "ws") + "/ws";

/* =========================================
   CONNECT TO TRAIN WEBSOCKET
========================================= */

export const connectTrainWebSocket = (onMessage, onStatusChange) => {
  // If already connected, do not re-create
  if (stompClient && stompClient.active) {
    console.log("[WebSocket] Already active, skipping redundant connection.");
    return;
  }

  // Deactivate any stale client
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch (_) {}
    stompClient = null;
  }

  if (onStatusChange) {
    onStatusChange("connecting");
  }

  stompClient = new Client({
    brokerURL: WEBSOCKET_URL,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    debug: (message) => {
      // Keep debugging clean in production
      if (import.meta.env.DEV) {
        console.log("[WebSocket]", message);
      }
    },

    onConnect: () => {
      console.log("[WebSocket] Connected successfully to:", WEBSOCKET_URL);

      if (onStatusChange) {
        onStatusChange("connected");
      }

      stompClient.subscribe(
        "/topic/train-status",
        (message) => {
          try {
            const data = JSON.parse(message.body);
            if (onMessage) {
              onMessage(data);
            }
          } catch (error) {
            console.error(
              "[WebSocket] Message parsing error:",
              error
            );
          }
        }
      );
    },

    onDisconnect: () => {
      console.log("[WebSocket] Disconnected");
      if (onStatusChange) {
        onStatusChange("disconnected");
      }
    },

    onWebSocketClose: () => {
      console.log("[WebSocket] Underlying connection closed");
      if (onStatusChange) {
        onStatusChange("disconnected");
      }
    },

    onStompError: (frame) => {
      console.error("[WebSocket] STOMP error:", frame);
      if (onStatusChange) {
        onStatusChange("error");
      }
    },

    onWebSocketError: (error) => {
      console.error("[WebSocket] Connection error:", error);
      if (onStatusChange) {
        onStatusChange("error");
      }
    },
  });

  stompClient.activate();
};

/* =========================================
   DISCONNECT
========================================= */

export const disconnectTrainWebSocket = () => {
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch (e) {
      console.warn("[WebSocket] Error while deactivating:", e);
    }
    stompClient = null;
    console.log("[WebSocket] Disconnected and cleaned up");
  }
};
