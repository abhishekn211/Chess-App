// controllers/userController.js
import User from '../models/User.js'; // Import the User model
import mongoose from 'mongoose'; // For isValidObjectId check

// @desc    Get user profile by ID or for the authenticated user
// @route   GET /api/users/:id OR /api/users/profile
// @access  Public (for :id) or Private (for /profile)
const getUserProfile = async (req, res) => {
  // Determine the user ID to fetch:
  // If req.params.id exists, it's a request for a public profile.
  // Otherwise, if req.user exists (from `protect` middleware), it's the authenticated user's own profile.
  const targetUserId = req.params.id || (req.user ? req.user._id : null);

  if (!targetUserId) {
    console.error("Error: User ID not provided or not authenticated.");
    return res.status(400).json({ message: "User ID not provided or not authenticated." });
  }

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    console.error("Error: Invalid user ID format.");
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(targetUserId).select('-password'); // Always exclude password

    if (!user) {
      console.error(`Error: User not found for ID: ${targetUserId}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    // Conditional response based on route type
    // If req.params.id is present, it means it's the public profile route (/api/users/:id)
    if (req.params.id) {
      // Public profile: Do NOT show _id or email
      res.status(200).json({
        username: user.username,
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        gamesWin: user.gamesWin,
        gamesLoss: user.gamesLoss,
        gamesDraw: user.gamesDraw,
      });
    } else {
      // Authenticated user's own profile: Show all details including _id and email
      res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        gamesWin: user.gamesWin,
        gamesLoss: user.gamesLoss,
        gamesDraw: user.gamesDraw,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }
  } catch (error) {
    console.error('Internal Server Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal Server Error fetching user profile.' });
  }
};

// @desc    Edit authenticated user's profile
// @route   PATCH /api/users/:id
// @access  Private
const editUserProfile = async (req, res) => {
  const userId = req.params.id;
  // Only allow username to be updated for now, as per requirement
  const { username } = req.body;

  // Security check: Ensure the authenticated user is editing their own profile
  if (req.user._id.toString() !== userId) {
    console.error(`Forbidden: User ${req.user._id} tried to edit profile of ${userId}`);
    return res.status(403).json({ message: "Forbidden: You can only edit your own profile." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error(`Error: Invalid user ID format for ID: ${userId}`);
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error(`Error: User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update username if provided
    if (username) user.username = username;
    // Email and password updates are not allowed for now as per requirement

    const updatedUser = await user.save(); // Save the updated user

    res.status(200).json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email, // Email is still part of the user object, so return it
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    // Handle unique constraint errors (e.g., duplicate username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      console.error(`Error: Duplicate key for field '${field}':`, error);
      return res.status(400).json({ message: `${field} already taken.` });
    }
    // Handle validation errors (e.g., minlength for username)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      console.error('Validation Error:', messages.join(', '));
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Internal Server Error updating profile:', error);
    res.status(500).json({ message: 'Internal Server Error updating profile.' });
  }
};


const deleteUserProfile = async (req, res) => {
  const userId = req.params.id;

  if (req.user._id.toString() !== userId) {
    console.error(`Forbidden: User ${req.user._id} tried to delete profile of ${userId}`);
    return res.status(403).json({ message: "Forbidden: You can only delete your own profile." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error(`Error: Invalid user ID format for ID: ${userId}`);
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      console.error(`Error: User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User profile deleted successfully.' });
  } catch (error) {
    console.error('Internal Server Error deleting profile:', error);
    res.status(500).json({ message: 'Internal Server Error deleting profile.' });
  }
};


const getAllFriends = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId)
      .select('friends')
      .populate('friends', 'username email eloRating');

    if (!user) {
      console.error(`Error: Authenticated user not found for ID: ${userId}`);
      return res.status(404).json({ message: 'Authenticated user not found.' });
    }

    res.status(200).json({
      message: user.friends.length === 0 ? 'No friends found.' : 'Friends fetched successfully.',
      friends: user.friends,
    });
  } catch (error) {
    console.error('Internal Server Error fetching friends:', error);
    res.status(500).json({ message: 'Internal Server Error fetching friends.' });
  }
};


const removeFriend = async (req, res) => {
  const userId = req.user._id;
  const friendIdToRemove = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(friendIdToRemove)) {
    console.error(`Error: Invalid friend ID format for ID: ${friendIdToRemove}`);
    return res.status(400).json({ message: 'Invalid friend ID format.' });
  }

  if (userId.toString() === friendIdToRemove) {
    console.error(`Error: User ${userId} tried to remove self as friend.`);
    return res.status(400).json({ message: 'Cannot remove yourself as a friend.' });
  }

  try {
    const currentUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { friends: friendIdToRemove } },
      { new: true }
    );

    const friendUser = await User.findByIdAndUpdate(
      friendIdToRemove,
      { $pull: { friends: userId } },
      { new: true }
    );

    if (!currentUser || !friendUser) {
      console.error(`Error: User ${userId} or friend ${friendIdToRemove} not found during removal.`);
      return res.status(404).json({ message: 'User or friend not found.' });
    }

    res.status(200).json({ message: 'Friend removed successfully.' });
  } catch (error) {
    console.error('Internal Server Error removing friend:', error);
    res.status(500).json({ message: 'Internal Server Error removing friend.' });
  }
};


const sendFriendRequest = async (req, res) => {
  const senderId = req.user._id;
  const receiverId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    console.error(`Error: Invalid receiver ID format for ID: ${receiverId}`);
    return res.status(400).json({ message: 'Invalid receiver ID format.' });
  }

  if (senderId.toString() === receiverId) {
    console.error(`Error: User ${senderId} tried to send friend request to self.`);
    return res.status(400).json({ message: 'Cannot send friend request to yourself.' });
  }

  try {
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      console.error(`Error: Sender ${senderId} or receiver ${receiverId} not found.`);
      return res.status(404).json({ message: 'Sender or receiver user not found.' });
    }

    if (sender.friends.includes(receiverId)) {
      console.error(`Error: User ${senderId} is already friends with ${receiverId}.`);
      return res.status(400).json({ message: 'Already friends with this user.' });
    }

    if (sender.friendRequestsSent.includes(receiverId)) {
      console.error(`Error: Friend request already sent from ${senderId} to ${receiverId}.`);
      return res.status(400).json({ message: 'Friend request already sent to this user.' });
    }

    // Check for mutual request - if receiver already sent a request to sender
    if (receiver.friendRequestsSent.includes(senderId)) {
      await User.findByIdAndUpdate(senderId, {
        $addToSet: { friends: receiverId },
        $pull: { friendRequestsReceived: receiverId }
      });
      await User.findByIdAndUpdate(receiverId, {
        $addToSet: { friends: senderId },
        $pull: { friendRequestsSent: senderId }
      });
      return res.status(200).json({ message: 'Friend request accepted automatically (mutual request).', status: 'accepted' });
    }

    await User.findByIdAndUpdate(senderId, { $addToSet: { friendRequestsSent: receiverId } });
    await User.findByIdAndUpdate(receiverId, { $addToSet: { friendRequestsReceived: senderId } });

    res.status(200).json({ message: 'Friend request sent successfully.', status: 'pending' });
  } catch (error) {
    console.error('Internal Server Error sending friend request:', error);
    res.status(500).json({ message: 'Internal Server Error sending friend request.' });
  }
};


const getFriendRequests = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId)
      .select('friendRequestsReceived')
      .populate('friendRequestsReceived', 'username email');

    if (!user) {
      console.error(`Error: Authenticated user not found for ID: ${userId}`);
      return res.status(404).json({ message: 'Authenticated user not found.' });
    }

    res.status(200).json({
      message: user.friendRequestsReceived.length === 0 ? 'No pending friend requests.' : 'Friend requests fetched successfully.',
      friendRequests: user.friendRequestsReceived,
    });
  } catch (error) {
    console.error('Internal Server Error fetching friend requests:', error);
    res.status(500).json({ message: 'Internal Server Error fetching friend requests.' });
  }
};

const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Public profile data return karein
    res.status(200).json({
        _id: user._id, // ID bhej rahe hain taaki history fetch kar sakein
        username: user.username,
        email: user.email, // Email bhi bhej rahe hain for consistency
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        gamesWin: user.gamesWin,
        gamesLoss: user.gamesLoss,
        gamesDraw: user.gamesDraw,
    });
  } catch (error) {
    console.error('Error fetching profile by username:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const respondToFriendRequest = async (req, res) => {
  const receiverId = req.user._id;
  const senderId = req.params.id;
  const { action } = req.body; // 'accept' or 'reject'

  if (!mongoose.Types.ObjectId.isValid(senderId)) {
    console.error(`Error: Invalid sender ID format for ID: ${senderId}`);
    return res.status(400).json({ message: 'Invalid sender ID format.' });
  }

  if (!['accept', 'reject'].includes(action)) {
    console.error(`Error: Invalid action '${action}'. Must be "accept" or "reject".`);
    return res.status(400).json({ message: 'Invalid action. Must be "accept" or "reject".' });
  }

  try {
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);

    if (!receiver || !sender) {
      console.error(`Error: Receiver ${receiverId} or sender ${senderId} not found.`);
      return res.status(404).json({ message: 'Receiver or sender user not found.' });
    }

    if (!receiver.friendRequestsReceived.includes(senderId)) {
      console.error(`Error: Friend request from ${senderId} to ${receiverId} not found.`);
      return res.status(400).json({ message: 'Friend request not found from this user.' });
    }

    if (action === 'accept') {
      await User.findByIdAndUpdate(receiverId, {
        $addToSet: { friends: senderId },
        $pull: { friendRequestsReceived: senderId }
      });
      await User.findByIdAndUpdate(senderId, {
        $addToSet: { friends: receiverId },
        $pull: { friendRequestsSent: receiverId }
      });
      res.status(200).json({ message: 'Friend request accepted successfully.', status: 'accepted' });
    } else if (action === 'reject') {
      await User.findByIdAndUpdate(receiverId, { $pull: { friendRequestsReceived: senderId } });
      await User.findByIdAndUpdate(senderId, { $pull: { friendRequestsSent: receiverId } });
      res.status(200).json({ message: 'Friend request rejected successfully.', status: 'rejected' });
    }
  } catch (error) {
    console.error('Internal Server Error responding to friend request:', error);
    res.status(500).json({ message: 'Internal Server Error responding to friend request.' });
  }
};

// controllers/userController.js (Add this)
const searchUsers = async (req, res) => {
    const { username } = req.query; // Get username from query parameters

    if (!username) {
        return res.status(400).json({ message: "Username query parameter is required." });
    }
    if(username===req.user.username){
        return res.status(400).json({message:"Searching Yours username yourself"})
    }

    try {
        // Find users whose username matches (case-insensitive search using regex)
        // You might want to limit results or add pagination for large user bases
        const users = await User.find({
            username: { $regex: username, $options: 'i' } // Case-insensitive search
        }).select('_id username eloRating'); // Only return necessary public info

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found with that username." });
        }

        res.status(200).json({
            message: "Users found successfully.",
            users: users
        });
    } catch (error) {
        console.error('Internal Server Error searching users:', error);
        res.status(500).json({ message: 'Internal Server Error searching users.' });
    }
};


export {
  getUserProfile,
  editUserProfile,
  deleteUserProfile,
  getAllFriends,
  removeFriend,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  searchUsers,
  getUserProfileByUsername
};