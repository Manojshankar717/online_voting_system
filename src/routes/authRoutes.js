// src/routes/authRoutes.js

import express from 'express';
import {
  registerController,
  verifyEmailOtpController,
  requestLoginOtpController,
  loginController,
  refreshTokenController
} from '../controllers/authController.js';

const router = express.Router();

// Register user
router.post('/register', registerController);

// Verify email OTP
router.post('/verify-email', verifyEmailOtpController);

// Request login OTP (password-less login)
router.post('/request-login-otp', requestLoginOtpController);

// Login (with password or OTP)
router.post('/login', loginController);

// Refresh token
router.post('/refresh-token', refreshTokenController);

export default router;
