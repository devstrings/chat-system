import { Server as Socket } from "socket.io";
import webSocketProvider from "#providers/webSocket.provider";
import { webSocketConnection } from "#controllers/socket.controller";

const socketSetting = (
  app,
  socketKey,
  socketIo,
  controllerCallback,
  authCallback = null
) => {
  // Store instance in app for API access
  app.set(socketKey, socketIo);

  if (authCallback) {
    socketIo.use(authCallback);
  }

  socketIo.on("connection", (instance) =>
    controllerCallback(socketIo, instance)
  );
};

const socketRoutes = {
  webSocket: null,
  connect: function (httpServer, app) {
    // Initialize primary webSocket namespace
    this.webSocket = new Socket(httpServer, {
      path: "/webSocket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    socketSetting(
      app,
      "webSocket",
      this.webSocket,
      webSocketConnection,
      webSocketProvider
    );

    console.log(" Socket.IO initialized with path: /webSocket");
  },
};

export default socketRoutes;
