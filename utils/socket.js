import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected to websocket: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected from websocket: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
