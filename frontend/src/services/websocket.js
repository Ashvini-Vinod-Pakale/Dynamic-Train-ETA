import { Client } from "@stomp/stompjs";

let stompClient = null;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080";

const WEBSOCKET_URL =
  API_BASE_URL.replace(/^http/, "ws") + "/ws";

/* =========================================
   CONNECT TO TRAIN WEBSOCKET
========================================= */

export const connectTrainWebSocket = (onMessage) => {

  stompClient = new Client({

    brokerURL: WEBSOCKET_URL,

    reconnectDelay: 5000,

    debug: (message) => {
      console.log("[WebSocket]", message);
    },

    onConnect: () => {

      console.log(
        "WebSocket connected successfully"
      );

      stompClient.subscribe(
        "/topic/train-status",
        (message) => {

          try {

            const data =
              JSON.parse(message.body);

            console.log(
              "WebSocket train update:",
              data
            );

            if (onMessage) {
              onMessage(data);
            }

          } catch (error) {

            console.error(
              "WebSocket message parsing error:",
              error
            );

          }

        }
      );

    },

    onStompError: (frame) => {

      console.error(
        "WebSocket STOMP error:",
        frame
      );

    },

    onWebSocketError: (error) => {

      console.error(
        "WebSocket connection error:",
        error
      );

    },

  });

  stompClient.activate();

};


/* =========================================
   DISCONNECT
========================================= */

export const disconnectTrainWebSocket = () => {

  if (stompClient) {

    stompClient.deactivate();

    stompClient = null;

    console.log(
      "WebSocket disconnected"
    );

  }

};
