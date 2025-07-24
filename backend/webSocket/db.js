// backend/webSocket/db.js

import mongoose from 'mongoose';
import User from '../models/User.js'; // Import your existing User model

const messageSchema = new mongoose.Schema({
    senderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Reference to the User who sent the message
        required: true 
    },
    senderUsername: { 
        type: String, 
        required: true 
    },
    text: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now // Automatically set the time
    }
});



// --- Define Game Schema for WebSocket context ---
// This schema will be used by the Game.js class to persist game state.
// It should match your main backend/models/Game.js if you create it separately.
const gameSchema = new mongoose.Schema({
  id: { // Game ID (UUID)
    type: String,
    required: true,
    unique: true,
  },
  whitePlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  blackPlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Can be null if waiting for the second player
  },
  status: {
    type: String, // Enum: 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIME_UP', 'PLAYER_EXIT'
    required: true,
    default: 'IN_PROGRESS',
  },
  result: { // 'WHITE_WINS', 'BLACK_WINS', 'DRAW', null
    type: String,
    default: null,
  },
  timeControl: { // e.g., 'CLASSICAL', 'BLITZ', 'BULLET'
    type: String,
    default: 'CLASSICAL',
  },
  startingFen: {
    type: String,
    required: true,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  currentFen: { // Current board state
    type: String,
    required: true,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  startAt: { // Game start time
    type: Date,
    default: Date.now,
  },
  endAt: { // Game end time
    type: Date,
    default: null,
  },
  lastMoveTime: { // NEW: To store the timestamp of the last move for timer calculations
    type: Date,
    default: Date.now,
  },
  player1TimeConsumed: { // White player time consumed in milliseconds
    type: Number,
    default: 0,
  },
  player2TimeConsumed: { // Black player time consumed in milliseconds
    type: Number,
    default: 0,
  },
  chatHistory: [messageSchema], // Array of messages exchanged during the game
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// --- Define Move Schema for WebSocket context ---
const moveSchema = new mongoose.Schema({
  gameId: {
    type: String, // Link to the Game ID (UUID)
    ref: 'Game', // Reference to the Game model by its 'id' field
    required: true,
  },
  moveNumber: {
    type: Number,
    required: true,
  },
  from: {
    type: String, // e.g., 'e2'
    required: true,
  },
  to: {
    type: String, // e.g., 'e4'
    required: true,
  },
  // FEN before and after the move (useful for debugging/analysis)
  before: {
    type: String,
    required: true,
  },
  after: {
    type: String,
    required: true,
  },
  san: { // Standard Algebraic Notation (e.g., 'e4', 'Nf3')
    type: String,
    required: true,
  },
  timeTaken: { // Time taken for this specific move
    type: Number, // In milliseconds
    default: 0,
  },
  createdAt: { // Timestamp of the move
    type: Date,
    default: Date.now,
  },
});

// Create Mongoose Models
const Game = mongoose.model('Game', gameSchema);
const Move = mongoose.model('Move', moveSchema);

// Export all necessary models
export const db = {
  User, // Your existing User model
  game: Game,
  move: Move,
};