// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure usernames are unique
    lowercase: true, // Store usernames in lowercase for consistency
    trim: true, // Remove whitespace from beginning/end
    minlength: 3, // Minimum length for username
    trim: true, // Remove whitespace from beginning/end
    minlength: 3, // Minimum length for username
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Store emails in lowercase for consistency
    trim: true,
    // Basic email validation regex
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: false, // Password is optional for Google auth
    minlength: 6, // Minimum length for password for security
  },
  profilePicture: {
    type: String,
    default: '', // Default to empty string if no profile picture is set
  },
  authProvider: {
    type: String,
    required: true,
    enum: ['credentials', 'google'], // Only allow these two values
    default: 'credentials'
  },
  eloRating: {
    type: Number,
    default: 1200, // Common starting ELO rating for new users
  },
  gamesPlayed: {
    type: Number,
    default: 0,
  },
  gamesWin: {
    type: Number,
    default: 0,
  },
  gamesLoss: { // Added: To track total losses in PvP games
    type: Number,
    default: 0,
  },
  gamesDraw: {
    type: Number,
    default: 0,
  },
  currentActiveGame: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game', // Reference to the Game model (assuming you'll create one)
    default: null, // No active game by default
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References other User documents
    },
  ],
  friendRequestsSent: [ // Friend requests initiated by this user
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  friendRequestsReceived: [ // Friend requests received by this user
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
}, { timestamps: true }); // Mongoose will automatically add createdAt and updatedAt fields


const User = mongoose.model('User', userSchema);

export default User;