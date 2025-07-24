// server.js

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose'; // Mongoose import karein

// Routes
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';


// Socket.IO server initialization function
import initSocketServer from './webSocket/socket.js'; // Correct path

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Database Connection ---
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
connectDB(); // Connect to MongoDB

// --- Socket.IO Server Initialization ---
const io = initSocketServer(server); // Pass the HTTP server instance

// --- REST API Routes ---
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);


// --- Basic Route for Server Health Check ---
app.get('/', (req, res) => {
  res.send('Chess Server is running (Express & Socket.IO)');
});

// --- Error Handling Middleware (Optional) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

