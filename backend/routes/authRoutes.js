import express from 'express';
import { authStatus, loginUser, logoutUser, registerUser,googleAuth } from '../controllers/authController.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Auth route is working');
});

router.post('/google',googleAuth)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/status',protect, authStatus);

export default router;
