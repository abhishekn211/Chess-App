import bcrypt from "bcryptjs"; // Now explicitly used for hashing/comparison
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from 'dotenv';
import oauth2Client from "../googleConfig.js";
import { google } from "googleapis";
import axios from "axios";

dotenv.config();

// Function to generate JWT token
const generateToken = (id,username) => {
  return jwt.sign({ id:id,username:username }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

// Function to set the JWT token as an HTTP-only cookie
const setJwtCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true, // Makes the cookie inaccessible to client-side JavaScript
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // 'None' requires secure: true
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};


// ------------------ Google Auth ------------------
export const googleAuth = async (req, res) => {
  const { code } = req.body;
  try {
    const googleRes= await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`,
    )

    const {email, name,picture } = userRes.data;
    let user = await User.findOne({ email });
    if(!user){
      const firstName = name.split(' ')[0];
      let baseUsername = firstName.toLowerCase().replace(/ /g, "");

      // 2. Append a random number to make it unique
      let uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;

      // 3. Optional: Check if this generated username is also taken (rare case)
      let existingUsername = await User.findOne({ username: uniqueUsername });
      while(existingUsername) {
        uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
        existingUsername = await User.findOne({ username: uniqueUsername });
      }
      // If user does not exist, create a new user
      user = new User({
        username: uniqueUsername,
        email: email,
        authProvider: 'google',
        profilePicture: picture // Assuming you have a field for profile picture
      });
      await user.save();
      console.log("User saved to database", user);
    }
    const token = generateToken(user._id, user.username);
    setJwtCookie(res, token); // Set the cookie
    res.status(200).json({
      message: "Google authentication successful",
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture // Return profile picture if available
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A user with similar details already exists." });
    }
    console.error("Google authentication failed:", error);
    res.status(500).json({ message: "Google authentication failed", error: error.message });
  }
}

// ------------------ Register ------------------
export const registerUser = async (req, res) => {
  const { username, password, email } = req.body;
  try {
    // Check for existing username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    // Explicitly hash password here before creating the user
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    const newUser = new User({
      username,
      password: hashedPassword, // Store the hashed password
      email
    });
    await newUser.save(); // Save the new user

    console.log("User Created and saved to database")
    const token = generateToken(newUser._id,newUser.username);
    setJwtCookie(res, token); // Set the cookie
    res.status(201).json({
      message: "User registered successfully",
      _id: newUser._id,
      username: newUser.username, // Changed from 'name' to 'username' for consistency
      email: newUser.email
    });
  } catch (error) {
    console.error("Error registering user:", error);
    // Handle specific duplicate key error if not caught by findOne (e.g., race condition)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} already taken.` });
    }
    // Handle validation errors (e.g., minlength, match)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Login ------------------
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.authProvider === 'google') {
      console.log("User tried to login with Google account using credentials");
      return res.status(400).json({ 
        message: "Account was created with Google. Please use Google Sign In" 
      });
      
    }
    // Explicitly compare password here
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id,user.username);
    setJwtCookie(res, token); // Set the cookie

    res.status(200).json({
      message: "Login Successful",
      _id: user._id,
      username: user.username, // Changed from 'name' to 'username' for consistency
      email: user.email
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Logout ------------------
export const logoutUser = (req, res) => {
  res.clearCookie('token', { // Ensure cookie name is 'token'
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  });
  res.status(200).json({ message: "User logged out successfully" });
};

// ------------------ Auth Status ------------------
export const authStatus = async (req, res) => {
  try {
    // req.user is populated by the 'protect' middleware
    const user = req.user;
    // The 'protect' middleware already handles authentication failure by returning 401
    // So, if code reaches here, req.user should be valid.
    res.status(200).json({
      message: "OK",
      _id: user._id,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error("Error fetching auth status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};