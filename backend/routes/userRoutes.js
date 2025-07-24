import express from 'express';
import {
  getUserProfile,
  editUserProfile,
  deleteUserProfile,
  getAllFriends, // Renamed from getFriends for clarity in this context
  removeFriend,
  sendFriendRequest,
  respondToFriendRequest, // Renamed for clarity (accept/reject)
  getFriendRequests, // Added: To fetch pending requests
  getUserProfileByUsername,
  searchUsers
} from '../controllers/userController.js'
import { protect } from '../middleware/protect.js'; 


const router = express.Router();

router.get('/', (req, res) => {
  res.send('User route is working');
});

router.get('/profile', protect, getUserProfile);
router.get('/friends',protect,getAllFriends)
router.get('/friend-requests', protect, getFriendRequests);
//to search by username
router.get('/search',protect,searchUsers);
router.get('/u/:username', protect, getUserProfileByUsername);
router.get('/:id', getUserProfile);
router.patch('/:id',protect,editUserProfile);
router.delete('/:id',protect,deleteUserProfile);
router.delete('/friend/:id',protect,removeFriend);
router.post('/friend/:id',protect,sendFriendRequest);
// The request body will likely contain a status like { action: 'accept' | 'reject' }
router.patch('/friend-request/:id', protect, respondToFriendRequest);





export default router;
