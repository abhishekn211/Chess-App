// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Import User model
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const protect = async (req, res, next) => {
  let token;

  // Check if the JWT token exists in cookies
  // Assuming your cookie name is 'token'
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // If a token is found in cookies
  if (token) {
    try {
      // Verify the token using the JWT_SECRET from environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user in the database based on the ID from the decoded token
      // and attach the user object (excluding the password) to the request.
      req.user = await User.findById(decoded.id).select('-password');
      
      // If no user is found for the decoded ID
      if (!req.user) {
        console.error(`Auth Error: User not found for decoded ID: ${decoded.id}`);
        // Clear the invalid cookie and send unauthorized response
        res.clearCookie('jwt'); // Clear the cookie if user not found
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next(); // If token is valid and user exists, proceed to the next middleware/route
    } catch (error) {
      // Handle various JWT errors (e.g., token expired, invalid signature)
      console.error('JWT verification error:', error);
      // Clear the invalid cookie and send unauthorized response
      res.clearCookie('jwt'); // Clear the cookie on token failure
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // If no token is provided in the cookies
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export { protect };