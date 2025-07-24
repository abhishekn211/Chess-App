import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import * as cookie from 'cookie';
import { GameManager } from './GameManager.js';

dotenv.config();
let gameManager;

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "https://chess-app-opal.vercel.app"],
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  // create & export the one GameManager instance
  gameManager = new GameManager(io);

  // ── AUTH MIDDLEWARE ──
  io.use(async (socket, next) => {
    const cookiesString = socket.handshake.headers.cookie;
    if (!cookiesString) return next(new Error('Authentication error: Cookies not provided.'));
    const parsed = cookie.parse(cookiesString);
    const token  = parsed.token;
    if (!token) return next(new Error('Authentication error: Token not found.'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.username=decoded.username?decoded.username:decoded.id.slice(-2);
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  // ── CONNECTION ──
  io.on('connection', (socket) => {
    console.log(`Socket.js:  ${socket.username} Connected (User id: ${socket.userId}) (Socket id: ${socket.id}) `);
    gameManager.addUser(socket);

    socket.on('disconnect', () => {
      console.log(`Socket.js:  ${socket.username} Disconnected  (User id: ${socket.userId}) (Socket id: ${socket.id})`);
      gameManager.removeUser(socket.id, socket.userId);
    });
  });

  console.log('Socket.IO server logic initialized.');
  return io;
};

export default initSocketServer;

