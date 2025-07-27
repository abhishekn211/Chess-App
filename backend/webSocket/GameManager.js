// backend/webSocket/GameManager.js

import { socketManager } from './SocketManager.js';
import { Game } from './Game.js';
import { db } from './db.js';
import {
  INIT_GAME, MOVE, JOIN_ROOM, EXIT_GAME, GAME_JOINED,
  GAME_NOT_FOUND, GAME_ADDED, GAME_ENDED, GAME_ALERT,
  PLAYER_DISCONNECTED, PLAYER_RECONNECTED, INVALID_MOVE,
  CREATE_PRIVATE_GAME,PRIVATE_GAME_ADDED,FIND_ACTIVE_GAMES,ACTIVE_GAME_FOUND,NO_ACTIVE_GAME_FOUND, CANCEL_SEARCH, CHAT_MESSAGE,
  NEW_CHAT_MESSAGE
} from './messages.js';

const GameStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  TIME_UP: 'TIME_UP',
  PLAYER_EXIT: 'PLAYER_EXIT',
};

export class GameManager {
  games = [];
  pendingGameId = null;
  io;

  constructor(ioInstance) {
    this.io = ioInstance;
    this.loadActiveGamesFromDb();
  }

  async loadActiveGamesFromDb() {
    try {
      const activeGames = await db.game.find({ status: GameStatus.IN_PROGRESS })
        .populate([
          { path: 'whitePlayerId', select: '_id username' },
          { path: 'blackPlayerId', select: '_id username' }
        ]);

      for (const gameDoc of activeGames) {
        const moves = await db.move.find({ gameId: gameDoc.id }).sort({ moveNumber: 1 });

        const game = new Game(
          gameDoc.whitePlayerId._id.toString(),
          gameDoc.blackPlayerId?._id?.toString() || null,
          this.io,
          gameDoc.id,
          gameDoc.startAt
        );

        game.seedMoves(moves);
        this.games.push(game);
      }

      console.log(`✅ Loaded ${this.games.length} in-progress games from DB.`);
    } catch (err) {
      console.error("❌ Error loading games from DB:", err);
    }
  }

  addUser(socket) {
    socketManager.removeExistingSocket(socket);
    this.addHandler(socket);
    console.log(`GameManager : ${socket.username} Connected For messages (User id: ${socket.userId}) (${socket.id})`);
  }

   //agar koi game already search mai hai or dusre player ka wait kr ra hai to use remove krne k liye before searching new game or creating new pvt game
   // ya fir socket disconnect hone pe baki sbko btane k liye
  removeUser(socketId, userId) {
    
    const game = this.games.find(g =>
      (g.player1UserId === userId || g.player2UserId === userId) &&
      socketManager.getSocketsInRoom(g.gameId)?.some(s => s.id === socketId)
    );
    
    if (game) {
      console.log(`GameManager: Removing user ${userId} from game ${game.gameId.slice(-4)}.`)
      // If it's a pending game or waiting for player 2, remove it completely.
      if (game.gameId === this.pendingGameId || !game.player2UserId) {
        console.log(`GameManager: Removing pending or waiting game ${game.gameId.slice(-4)} for user ${userId}.`);
        this.removeGame(game.gameId);
        
      } else {
        // If it's an active game, just notify the opponent.
        const opponentId = game.player1UserId === userId ? game.player2UserId : game.player1UserId;
        console.log(`GameManager: Notifying opponent ${opponentId} of disconnection.`);
        if (opponentId) {
            socketManager.broadcast(game.gameId, PLAYER_DISCONNECTED, {
              message: 'Opponent disconnected. Waiting for reconnection...',
              userId,
            });
        }
      }
      socketManager.removeUser(socketId, userId);
    }
  }
 

  removeGame(gameId) {
    this.games = this.games.filter(g => g.gameId !== gameId);
    if (this.pendingGameId === gameId) this.pendingGameId = null;
  }

  addHandler(socket) {
    socket.on('message', async raw => {
      const message = JSON.parse(raw.toString());
      const { type, payload } = message;
      console.log(`GameManager: Message : ${type} received from ${socket.username} ${socket.userId}`);

      if (type === CANCEL_SEARCH) {
        console.log(`GameManager: User ${socket.username} is canceling their game search.`);
        this.removeUser(socket.id, socket.userId);
        socket.emit('search_cancelled'); // Notify client to allow navigation
        return;
      }

      if (type === FIND_ACTIVE_GAMES) {
        // Find an active game in memory for the user
        const activeGame = this.games.find(g =>
            (g.player1UserId === socket.userId || g.player2UserId === socket.userId) &&(g.player1UserId && g.player2UserId) &&
            !g.result // A game is active if it has no result yet
        );

        if (activeGame) {
          console.log("Game Manager: Sending Active Game")
            // If a game is found, send its details back to the user
            socket.emit(ACTIVE_GAME_FOUND, {
                gameId: activeGame.gameId,
                message: 'Active game found. Rejoining...',
            });
        } else {
            // If no game is found, notify the user
            console.log("Game Manager: No Active Game")
            socket.emit(NO_ACTIVE_GAME_FOUND, {});
        }
        return; // Stop further processing for this message type
      }

      if (type === INIT_GAME) {
        this.removeUser(socket.id,socket.userId);
        if (this.pendingGameId) {
          const existing = this.games.find(g => g.gameId === this.pendingGameId);
          if(!existing){
            socket.emit(GAME_ALERT, { message: 'Game exist as PendingId but not in Games array' });
            return;
          }
          if (existing.player1UserId === socket.userId) {
            socket.emit(GAME_ALERT, { message: 'Still Waiting for opponent' });
            return;
          }
          socketManager.addUser(socket, existing.gameId);
          await existing.updateSecondPlayer(socket);
          this.pendingGameId = null;
        } else {
          const newGame = new Game(socket.userId, null, this.io);
          this.games.push(newGame);
          console.log('GameManager: New Game added to Games')
          this.pendingGameId = newGame.gameId;

          socketManager.addUser(socket, newGame.gameId);
          socket.emit(GAME_ADDED, {
            gameId: newGame.gameId,
            message: 'Waiting for opponent to join...',
          });
        }
        return;
      }

      if (type === CREATE_PRIVATE_GAME) {
        this.removeUser(socket.id,socket.userId);
        const game = new Game(socket.userId, null, this.io);
        this.games.push(game);
        socketManager.addUser(socket, game.gameId);

        socket.emit(PRIVATE_GAME_ADDED, {
          gameId: game.gameId,
          message: 'Private room created. Share this ID to invite a friend.',
        });
        return;
      }

      if (type === JOIN_ROOM) {
    
       const { gameId } = payload;
        if (!gameId) {
          return socket.emit(GAME_ALERT, { message: 'Game ID is required.' });
        }

        let game = this.games.find(g => g.gameId === gameId);
  
        // --- ✅ FIX: Corrected logic to handle ended games from memory or DB ---
        // First, check if the game in memory has already ended.
        if (game && game.result) {
            // If it has, we must fetch the full details from the DB to send to the client.
            const gameDoc = await db.game.findOne({ id: gameId }).populate('whitePlayerId blackPlayerId', 'username');
            if (gameDoc) {
                const moves = await db.move.find({ gameId: gameDoc.id }).sort({ moveNumber: 1 });
                
                return socket.emit(GAME_ENDED, {
                    result: gameDoc.result,
                    status: gameDoc.status,
                    moves,
                    blackPlayer: { id: gameDoc.blackPlayerId._id.toString(), username: gameDoc.blackPlayerId.username },
                    whitePlayer: { id: gameDoc.whitePlayerId._id.toString(), username: gameDoc.whitePlayerId.username }
                });
                console.log(`GameManager: Game ${gameId} has already ended. Sending game details.`);
            }
        }

        // If game is not in memory, query the DB once.
        if (!game) {
            const gameDoc = await db.game.findOne({ id: gameId })
                .populate('whitePlayerId blackPlayerId', 'username');

            if (!gameDoc) {
                return socket.emit(GAME_NOT_FOUND, { message: 'Game not found.' });
            }

            // If game from DB has ended, notify the user and stop.
            if (gameDoc.status !== GameStatus.IN_PROGRESS) {
                const moves = await db.move.find({ gameId: gameDoc.id }).sort({ moveNumber: 1 });
                return socket.emit(GAME_ENDED, {
                    result: gameDoc.result,
                    status: gameDoc.status,
                    moves,
                    
                    blackPlayer: { id: gameDoc.blackPlayerId._id.toString(), username: gameDoc.blackPlayerId.username },
                    whitePlayer: { id: gameDoc.whitePlayerId._id.toString(), username: gameDoc.whitePlayerId.username }
                });
            }

            // Game is active in DB but not memory, so load it into memory.
            const moves = await db.move.find({ gameId: gameDoc.id }).sort({ moveNumber: 1 });
            game = new Game(
                gameDoc.whitePlayerId._id.toString(),
                gameDoc.blackPlayerId._id.toString(),
                this.io,
                gameDoc.id,
                gameDoc.startAt
            );
            game.seedMoves(moves);
            this.games.push(game);
        }
            

        if (game && !game.player2UserId) {
          if (socket.userId === game.player1UserId) {
            socket.emit(GAME_ALERT, { message: 'You are Player 1. Waiting for opponent.' });
            return;
          }
          socketManager.addUser(socket, game.gameId);
          await game.updateSecondPlayer(socket);
          return;
        }


        if (![game.player1UserId, game.player2UserId].includes(socket.userId)) {
          socket.emit(GAME_ALERT, { message: 'You are not a player in this game.' });
          return;
        }

        socketManager.addUser(socket, game.gameId);
        socketManager.broadcast(game.gameId, PLAYER_RECONNECTED, {
          userId: socket.userId,
          message: 'Opponent reconnected to the game.',
        });

       const moves = await db.move.find({ gameId: game.gameId }).sort({ moveNumber: 1 });
        const whitePlayer = await db.User.findById(game.player1UserId).select('username');
        const blackPlayer = await db.User.findById(game.player2UserId).select('username');
        const chatHistory = await db.game.findOne({ id: game.gameId }).select('chatHistory');
        socket.emit(GAME_JOINED, {
          gameId: game.gameId,
          fen: game.board.fen(),
          moves,
          whitePlayer: { username: whitePlayer?.username, id: game.player1UserId },
          blackPlayer: { username: blackPlayer?.username, id: game.player2UserId  },
          player1TimeConsumed: game.getPlayer1TimeConsumed(),
          player2TimeConsumed: game.getPlayer2TimeConsumed(),
          chatHistory: chatHistory?.chatHistory || [],
        });
        return;
      }

      if (type === MOVE) {
        console.log(`SOCKET ON (Incoming): '${MOVE}'`, payload);
        const { gameId, move } = payload;
        const game = this.games.find(g => g.gameId === gameId);
        if (!game) {
          socket.emit(GAME_ALERT, { message: 'Game not found.' });
          return;
        }

        await game.makeMove(socket.userId, move);

        if (game.result) {
          this.removeGame(game.gameId);
        }
        return;
      }

      if(type === CHAT_MESSAGE) {
        const { gameId, text } = payload;
        const userId = socket.userId;

        const game = await db.game.findOne({ id: gameId })
        if (!game) return;

        const newMessage = {
          senderId: userId,
          senderUsername: socket.username,
          text,
          timestamp: new Date(),
        };

        // Save the message to the game chat history
        game.chatHistory.push(newMessage);
        await game.save();
        console.log(`GameManager: New chat message from ${socket.username} in game ${gameId}: ${text}`);

        // Broadcast the message to all users in the game room
        socketManager.broadcast(gameId, NEW_CHAT_MESSAGE, newMessage);

      }

      if (type === EXIT_GAME) {
        const { gameId } = payload;
        const game = this.games.find(g => g.gameId === gameId);
        console.log(`GameManager: User ${socket.username} is exiting game ${gameId}.`);
        console.log(game);

        if (game) {
          await game.exitGame(socket.userId);
          this.removeGame(game.gameId);
        }
      }
    });
  }
}
