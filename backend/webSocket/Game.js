// backend/webSocket/Game.js

import { Chess } from 'chess.js'; // Chess game engine
import { db } from './db.js'; // Mongoose models (Game, Move, User)
import { socketManager } from './SocketManager.js'; // SocketManager instance
import { v4 as uuidv4 } from 'uuid'; // For generating unique game IDs

// Message types
import {
  INIT_GAME, MOVE, GAME_ENDED, INVALID_MOVE,
  GAME_ALERT, BOARD_STATE,
} from './messages.js';

// Game status and result enums
const GAME_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  TIME_UP: 'TIME_UP',
  PLAYER_EXIT: 'PLAYER_EXIT',
};

const GAME_RESULT = {
  WHITE_WINS: 'WHITE_WINS',
  BLACK_WINS: 'BLACK_WINS',
  DRAW: 'DRAW',
};

const GAME_TIME_MS = 10 * 60 * 1000; // 10 minutes per player
const K_FACTOR = 32; // K-factor for Elo calculation

// Helper function for pawn promotion
function isPromoting(chessInstance, from, to) {
  const piece = chessInstance.get(from);
  if (!piece || piece.type !== 'p' || piece.color !== chessInstance.turn()) return false;
  if (!['1', '8'].some((rank) => to.endsWith(rank))) return false;
  return chessInstance.moves({ square: from, verbose: true }).map((m) => m.to).includes(to);
}

export class Game {
  gameId;
  player1UserId; // White
  player2UserId; // Black
  board;
  moveCount = 0;
  result = null;
  player1TimeConsumed = 0;
  player2TimeConsumed = 0;
  startTime;
  lastMoveTime;
  io;
  abandonmentTimer = null;
  moveTimer = null;

  constructor(player1UserId, player2UserId, ioInstance, gameId = uuidv4(), startTime = new Date()) {
    this.player1UserId = player1UserId;
    this.player2UserId = player2UserId;
    this.io = ioInstance;
    this.board = new Chess();
    this.gameId = gameId;
    this.startTime = startTime;
    this.lastMoveTime = startTime;
    console.log(`Game: New Game created with ID: ${this.gameId} and Player1:${player1UserId} and Player2:${player2UserId}`);
  }

  // (No changes to seedMoves, updateSecondPlayer, createGameInDb, addMoveToDb)
  seedMoves(moves) {
    console.log(`Game ${this.gameId}: Seeding ${moves.length} moves from database.`);
    moves.forEach((move) => {
      if (isPromoting(this.board, move.from, move.to)) {
        this.board.move({ from: move.from, to: move.to, promotion: 'q' });
      } else {
        this.board.move({ from: move.from, to: move.to });
      }
      if (move.timeTaken) {
        if (move.moveNumber % 2 !== 0) {
          this.player1TimeConsumed += move.timeTaken;
        } else {
          this.player2TimeConsumed += move.timeTaken;
        }
      }
    });
    this.moveCount = moves.length;
    if (moves.length > 0) {
      this.lastMoveTime = moves[moves.length - 1].createdAt;
    }
    this.resetAbandonmentTimer();
    this.resetMoveTimer();
    console.log(`Game ${this.gameId}: Board seeded to FEN: ${this.board.fen()}`);
  }

  async updateSecondPlayer(socket) {
    this.player2UserId = socket.userId;
    console.log(`Game ${this.gameId.slice(-2)}: Player 2 set to ${socket.username} ${socket.userId}.`);

    const users = await db.User.find({
      _id: { $in: [this.player1UserId, this.player2UserId] },
    }).select('username email');

    try {
      await this.createGameInDb();
    } catch (e) {
      console.error(`Game ${this.gameId}: Error creating/updating game in DB for second player:`, e);
      socketManager.broadcast(this.gameId, GAME_ALERT, { message: "Failed to start game due to a database error." });
      return;
    }

    const WhitePlayer = users.find((user) => user._id.toString() === this.player1UserId);
    const BlackPlayer = users.find((user) => user._id.toString() === this.player2UserId);

    socketManager.broadcast(
      this.gameId,
      INIT_GAME,
      {
        gameId: this.gameId,
        whitePlayer: { username: WhitePlayer?.username, id: WhitePlayer?._id.toString() },
        blackPlayer: { username: BlackPlayer?.username, id: BlackPlayer?._id.toString() },
        fen: this.board.fen(),
        moves: [],
        player1TimeConsumed: this.player1TimeConsumed,
        player2TimeConsumed: this.player2TimeConsumed,
      }
    );
    console.log(`Game ${this.gameId.slice(-4)}: INIT_GAME broadcasted to players. Game is now live.`);
    this.resetAbandonmentTimer();
    this.resetMoveTimer(); 
  }

  async createGameInDb() {
    this.startTime = new Date();
    this.lastMoveTime = this.startTime;

    let gameInDb = await db.game.findOne({ id: this.gameId });

    if (gameInDb) {
      gameInDb.blackPlayerId = this.player2UserId;
      gameInDb.status = GAME_STATUS.IN_PROGRESS;
      gameInDb.startAt = this.startTime;
      gameInDb.lastMoveTime = this.lastMoveTime;
      await gameInDb.save();
      console.log(`Game ${this.gameId}: Updated existing game in database.`);
    } else {
      await db.game.create({
        id: this.gameId,
        timeControl: 'CLASSICAL',
        status: GAME_STATUS.IN_PROGRESS,
        startingFen: this.board.fen(),
        currentFen: this.board.fen(),
        startAt: this.startTime,
        lastMoveTime: this.lastMoveTime,
        whitePlayerId: this.player1UserId,
        blackPlayerId: this.player2UserId,
      });
      console.log(`Game ${this.gameId.slice(-4)}: Created new game entry in database.`);
    }
  }

  async addMoveToDb(move, moveTimestamp) {
    const timeTakenForMove = moveTimestamp.getTime() - this.lastMoveTime.getTime();
    
    await db.move.create({
      gameId: this.gameId,
      moveNumber: this.moveCount + 1,
      from: move.from,
      to: move.to,
      before: move.before,
      after: move.after,
      san: move.san,
      timeTaken: timeTakenForMove,
      createdAt: moveTimestamp,
    });

    await db.game.updateOne(
      { id: this.gameId },
      {
        $set: {
          currentFen: move.after,
          lastMoveTime: moveTimestamp,
          player1TimeConsumed: this.player1TimeConsumed,
          player2TimeConsumed: this.player2TimeConsumed,
        },
      }
    );
    console.log(`Game ${this.gameId}: Move ${move.san} added to DB. Current FEN updated.`);
  }

  async makeMove(userId, moveData) {
    if ((this.board.turn() === 'w' && userId !== this.player1UserId) || (this.board.turn() === 'b' && userId !== this.player2UserId)) {
      socketManager.broadcast(this.gameId, GAME_ALERT, { message: "It's not your turn to move!" });
      return;
    }

    if (this.result) {
      socketManager.broadcast(this.gameId, GAME_ALERT, { message: "The game has already ended!" });
      return;
    }

    const moveTimestamp = new Date();
    let moveResult;
    try {
      moveResult = this.board.move(moveData);
    } catch (e) {
      socketManager.getSocketsInRoom(this.gameId)?.find(s => s.userId === userId)?.emit(INVALID_MOVE, { message: "Illegal move!", move: moveData });
      return;
    }

    if (!moveResult) {
      socketManager.getSocketsInRoom(this.gameId)?.find(s => s.userId === userId)?.emit(INVALID_MOVE, { message: "Invalid move!", move: moveData });
      return;
    }

    const timeTakenForMove = moveTimestamp.getTime() - this.lastMoveTime.getTime();
    if (this.board.turn() === 'b') { // White just moved
      this.player1TimeConsumed += timeTakenForMove;
    } else { // Black just moved
      this.player2TimeConsumed += timeTakenForMove;
    }

    await this.addMoveToDb(moveResult, moveTimestamp);
    
    this.lastMoveTime = moveTimestamp;
    this.resetAbandonmentTimer();
    this.resetMoveTimer();

    socketManager.broadcast(this.gameId, MOVE, { move: moveResult, player1TimeConsumed: this.player1TimeConsumed, player2TimeConsumed: this.player2TimeConsumed });
    socketManager.broadcast(this.gameId, BOARD_STATE, { fen: this.board.fen() });
    console.log(`Game: ${this.gameId}: Move ${moveResult.san} processed. Current FEN: ${this.board.fen()}`);

    if (this.board.isGameOver()) {
      let resultStatus;
      if (this.board.isCheckmate()) {
        resultStatus = this.board.turn() === 'w' ? GAME_RESULT.BLACK_WINS : GAME_RESULT.WHITE_WINS;
      } else {
        resultStatus = GAME_RESULT.DRAW;
      }
      await this.endGame(GAME_STATUS.COMPLETED, resultStatus);
      console.log(`Game ${this.gameId}: Game Over - ${resultStatus}.`);
    }

    this.moveCount++;
    console.log('moveCount:', this.moveCount);
  }

  getPlayer1TimeConsumed() {
    if (this.board.turn() === 'w') {
      return this.player1TimeConsumed + (new Date().getTime() - this.lastMoveTime.getTime());
    }
    return this.player1TimeConsumed;
  }

  getPlayer2TimeConsumed() {
    if (this.board.turn() === 'b') {
      return this.player2TimeConsumed + (new Date().getTime() - this.lastMoveTime.getTime());
    }
    return this.player2TimeConsumed;
  }
  
  resetAbandonmentTimer() {
    if (this.abandonmentTimer) clearTimeout(this.abandonmentTimer);
    this.abandonmentTimer = setTimeout(async () => {
      console.log(`Game ${this.gameId}: Abandonment timer expired.`);
      await this.endGame(GAME_STATUS.ABANDONED, this.board.turn() === 'b' ? GAME_RESULT.WHITE_WINS : GAME_RESULT.BLACK_WINS);
    }, 60 * 1000);
  }

  resetMoveTimer() {
    if (this.moveTimer) clearTimeout(this.moveTimer);
    const turn = this.board.turn();
    const timeLeft = GAME_TIME_MS - (turn === 'w' ? this.player1TimeConsumed : this.player2TimeConsumed);

    if (timeLeft <= 0) {
      this.endGame(GAME_STATUS.TIME_UP, turn === 'b' ? GAME_RESULT.WHITE_WINS : GAME_RESULT.BLACK_WINS);
      return;
    }

    this.moveTimer = setTimeout(async () => {
      console.log(`Game ${this.gameId}: Move timer expired.`);
      await this.endGame(GAME_STATUS.TIME_UP, turn === 'b' ? GAME_RESULT.WHITE_WINS : GAME_RESULT.BLACK_WINS);
    }, timeLeft);
  }

  async exitGame(exitingUserId) {
    console.log(`Game ${this.gameId}: User ${exitingUserId} explicitly exited.`);
    const res = exitingUserId === this.player1UserId ? GAME_RESULT.BLACK_WINS : GAME_RESULT.WHITE_WINS;
    await this.endGame(GAME_STATUS.PLAYER_EXIT, res);
  }

  async endGame(status, result) {
    if (this.result) {
      console.warn(`Game ${this.gameId}: Attempted to end an already ended game.`);
      return;
    }
    this.result = result;

    this.clearAbandonmentTimer();
    this.clearMoveTimer();

    const updatedGame = await db.game.findOneAndUpdate(
      { id: this.gameId },
      {
        $set: {
          status: status,
          result: result,
          endAt: new Date(),
          player1TimeConsumed: this.getPlayer1TimeConsumed(),
          player2TimeConsumed: this.getPlayer2TimeConsumed(),
        },
      },
      { new: true }
    );

    if (!updatedGame) {
      console.error(`Game ${this.gameId}: Failed to update game in DB on end.`);
      return;
    }
    
    const populatedGame = await db.game.findById(updatedGame._id)
                                      .populate('whitePlayerId blackPlayerId', 'username eloRating');

    if (!populatedGame) {
      console.error(`Game ${this.gameId}: Failed to retrieve populated game for broadcast.`);
      return;
    }

    const allMoves = await db.move.find({ gameId: this.gameId }).sort({ moveNumber: 1 });
    socketManager.broadcast(
      this.gameId,
      GAME_ENDED,
      {
        result: result,
        status: status,
        moves: allMoves,
        whitePlayer: { id: populatedGame.whitePlayerId._id.toString(), username: populatedGame.whitePlayerId.username },
        blackPlayer: { id: populatedGame.blackPlayerId._id.toString(), username: populatedGame.blackPlayerId.username },
      }
    );
    console.log(`Game ${this.gameId}: Game ended with status '${status}' and result '${result}'.`);

    if (status === GAME_STATUS.COMPLETED || status === GAME_STATUS.TIME_UP || status === GAME_STATUS.PLAYER_EXIT) {
        await this._updatePlayerStats(status, result, populatedGame.whitePlayerId, populatedGame.blackPlayerId);
    }
  }

  _calculateElo(whiteElo, blackElo, result) {
    const expectedScoreWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
    const expectedScoreBlack = 1 / (1 + Math.pow(10, (whiteElo - blackElo) / 400));

    let scoreWhite, scoreBlack;
    if (result === GAME_RESULT.WHITE_WINS) {
      scoreWhite = 1;
      scoreBlack = 0;
    } else if (result === GAME_RESULT.BLACK_WINS) {
      scoreWhite = 0;
      scoreBlack = 1;
    } else { // Draw
      scoreWhite = 0.5;
      scoreBlack = 0.5;
    }

    const newEloWhite = Math.round(whiteElo + K_FACTOR * (scoreWhite - expectedScoreWhite));
    const newEloBlack = Math.round(blackElo + K_FACTOR * (scoreBlack - expectedScoreBlack));

    return { newEloWhite, newEloBlack };
  }

  async _updatePlayerStats(status, result, whitePlayer, blackPlayer) {
    try {
        console.log(`Game ${this.gameId}: Updating player stats...`);

        const { newEloWhite, newEloBlack } = this._calculateElo(whitePlayer.eloRating, blackPlayer.eloRating, result);

        const whiteUpdate = {
            $inc: { gamesPlayed: 1 },
            eloRating: newEloWhite
        };
        const blackUpdate = {
            $inc: { gamesPlayed: 1 },
            eloRating: newEloBlack
        };

        // ✅ FIX: Using correct field names from your User model
        if (result === GAME_RESULT.WHITE_WINS) {
            whiteUpdate.$inc.gamesWin = 1;
            blackUpdate.$inc.gamesLoss = 1;
        } else if (result === GAME_RESULT.BLACK_WINS) {
            whiteUpdate.$inc.gamesLoss = 1;
            blackUpdate.$inc.gamesWin = 1;
        } else { // Draw
            whiteUpdate.$inc.gamesDraw = 1;
            blackUpdate.$inc.gamesDraw = 1;
        }
        
        await Promise.all([
            db.User.updateOne({ _id: whitePlayer._id }, whiteUpdate),
            db.User.updateOne({ _id: blackPlayer._id }, blackUpdate)
        ]);

        console.log(`Game ${this.gameId}: Stats updated for ${whitePlayer.username} (Elo: ${whitePlayer.eloRating} -> ${newEloWhite}) and ${blackPlayer.username} (Elo: ${blackPlayer.eloRating} -> ${newEloBlack}).`);

    } catch (error) {
        console.error(`Game ${this.gameId}: Critical error updating player stats:`, error);
    }
  }

  clearMoveTimer() {
    if (this.moveTimer) clearTimeout(this.moveTimer);
    this.moveTimer = null;
  }

  clearAbandonmentTimer() {
    if (this.abandonmentTimer) clearTimeout(this.abandonmentTimer);
    this.abandonmentTimer = null;
  }
}
